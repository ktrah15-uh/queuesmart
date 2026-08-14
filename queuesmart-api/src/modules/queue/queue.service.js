
const { db } = require('../../data/db');  // store.queueEntrie
const { ApiError } = require('../../utils/validate');
const notificationsService = require('../notifications/notifications.service');
const historyService = require('../history/history.service');
// A4: services moved to the Service table (Andres) - store.services no longer
// exists, so service lookups go through this instead of the old in-memory find().
const servicesService = require('../services/services.service');

const ALMOST_UP_POSITION = 2;
//notifies users in line that they are almost up based on their position in the queue
function notifyQueueAdvance(serviceId, fromPosition) {
    const service = servicesService.findService(serviceId);
    const serviceName = service ? service.name : 'your service';
    const waitingList = getQueueForService(serviceId);

    for (let i = fromPosition - 1; i < waitingList.length && i < ALMOST_UP_POSITION; i++) {
        notificationsService.notify(
            waitingList[i].userId,
            'almost_your_turn',
            'You are now #' + (i + 1) + ' in line for ' + serviceName + '.'
        );
    }
}

// retrives array of user waiting for a individual service, sorting them by oldest entries first 
function getQueueForService(serviceId) {

    const activeQueue = db.prepare(`SELECT id FROM Queue WHERE serviceId = ? AND status = 'open'`).get(serviceId);
    
    if(!activeQueue) {
        return [];
    }

    const entries = db.prepare(`SELECT * FROM QueueEntry WHERE queueId = ? AND status = 'waiting' ORDER BY joinTime ASC`).all(activeQueue.id);
    
    return entries;
}

//calculates estimated wiat time based on position
function calculateWaitTime(serviceId, position) {

    const service = servicesService.findService(serviceId);

    if(!service || position <= 1){
        return 0;
    }
    return (position - 1) * (service.expectedDuration || 15);
}

//adds a user to queue for a specific service
function joinQueue(userId, serviceId) {
    //makes sure service exists

   const activeQueue = db.prepare(`SELECT id FROM Queue WHERE serviceId = ? AND status = 'open'`).get(serviceId);

    if(!activeQueue){
        throw new ApiError(404, 'NOT_FOUND', 'This service is currently closed or does not exist');

    }
    // Check if the user already has an active ticket and prevent them from making another 
    const isWaiting = db.prepare(`SELECT id FROM QueueEntry WHERE userId = ? AND status = 'waiting'`).get(userId);

    if (isWaiting) {
        throw new ApiError(400, 'ALREADY_IN_QUEUE', 'You are already in Line');
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM QueueEntry WHERE queueId = ? AND status = 'waiting'`).get(activeQueue.id);

    const position = (countResult.count || 0) + 1;

    const joinTime = new Date().toISOString();
    const result = db.prepare(`INSERT INTO QueueEntry (queueId, userId,position , joinTime, status)
         VALUES (?, ?, ?, ?,'waiting')`).run(activeQueue.id, userId, position, joinTime);

    // Create a new queue entry
    const newEntryId = result.lastInsertRowid;
    const estimatedWaitTime = calculateWaitTime(serviceId, position);

    const ticket = {
        id: newEntryId,
        queueId: activeQueue.id,
        serviceId,
        userId,
        position,
        joinedAt: joinTime,
        status: 'waiting'
    }
 // Notify the user that they have joined the queue
    const service = servicesService.findService(serviceId);
    notificationsService.notify(
        userId,
        'queue_joined',
        'You joined ' + service.name + ' at position #' + position + '.'
    );
    if (position <= ALMOST_UP_POSITION) {
        notificationsService.notify(
            userId,
            'almost_your_turn',
            'You are #' + position + ' in line for ' + service.name + '. Almost your turn!'
        );
    }


    return {ticket, position, estimatedWaitTime };

}

//removes user from queue and update their status to left
function leaveQueue(userId, queueEntryId) {
    const entry = db.prepare(`SELECT * FROM QueueEntry WHERE id = ?`).get(queueEntryId);

    if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Queue entry not found');
    if (entry.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'User has wrong ticket');
    if (entry.status !== 'waiting') throw new ApiError(400, 'BAD_REQUEST', 'Queue entry is not in Line');

    const queue = db.prepare(`SELECT serviceId FROM Queue WHERE id = ?`).get(entry.queueId);
    const service = servicesService.findService(queue.serviceId);

    const waitingList = getQueueForService(queue.serviceId);
    const position = waitingList.findIndex(ticket => ticket.id === queueEntryId) + 1;

    db.prepare(`UPDATE QueueEntry SET status = 'canceled' WHERE id = ?`).run(queueEntryId);

    historyService.recordHistory({
        userId: entry.userId,
        serviceId: queue.serviceId,
        serviceName: service ? service.name : 'Unknown service',
        joinedAt: entry.joinTime,
        outcome: 'left'
    });
    notifyQueueAdvance(queue.serviceId, position);

    return { message: 'Successfully left the queue.' };
}

//retrives status and wait time of a user individual ticket
function getQueueStatus(userId, queueEntryId) {
    const entry = db.prepare(`SELECT * FROM QueueEntry WHERE id = ?`).get(queueEntryId);

    
    if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    if (entry.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Cannot view another users ticket');

//checking if status is waiting if not return 0 values 
    if(entry.status !== 'waiting'){
        return {ticket: entry, position: 0, estimatedWaitTime: 0};
    }

    const positionResult = db.prepare(`SELECT COUNT(*) as count FROM QueueEntry WHERE queueId = ? AND status = 
        'waiting' AND joinTime <= ?`).get(entry.queueId, entry.joinTime);

    const position = positionResult.count || 1;

    const queue = db.prepare(`SELECT serviceId FROM Queue WHERE id = ?`).get(entry.queueId);
    const estimatedWaitTime = calculateWaitTime(queue.serviceId, position);

    return { ticket: entry, position, estimatedWaitTime };
}

//moves the queue by marking the user first in line as served
function serveNext(serviceId) {

    const activeQueue =  db.prepare(`SELECT id FROM Queue WHERE serviceId = ? AND status = 'open'`).get(serviceId);
    
    if (!activeQueue) {
        throw new ApiError(404, 'NOT_FOUND', 'This service is currently closed or does not exist');
    }

    const upNext = db.prepare(`SELECT * FROM QueueEntry WHERE queueId = ? AND status = 'waiting' ORDER BY joinTime 
        ASC LIMIT 1`).get(activeQueue.id);

    if (!upNext) {
        throw new ApiError(404, 'NOT_FOUND', 'No users in line for this service');
    }

    db.prepare(`UPDATE QueueEntry SET status = 'served' WHERE id = ?`).run(upNext.id);
    upNext.status = 'served';

    const service = servicesService.findService(serviceId);

    historyService.recordHistory({
        userId: upNext.userId,
        serviceId: serviceId,
        serviceName: service ? service.name : 'Unknown service',
        joinedAt: upNext.joinTime,
        outcome: 'served'
    });

    notifyQueueAdvance(serviceId, 1);


    return { message: 'Next user served.', ticket: upNext };

}

module.exports = {
    getQueueForService,
    joinQueue,
    leaveQueue,
    getQueueStatus,
    serveNext,
    calculateWaitTime
};