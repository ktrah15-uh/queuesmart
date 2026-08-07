const { store, nextId } = require('../../data/store');  // store.queueEntries
const { ApiError } = require('../../utils/validate');
const notificationsService = require('../notifications/notifications.service');
const historyService = require('../history/history.service');
// A4: services moved to the Service table (Andres) - store.services no longer
// exists, so service lookups go through this instead of the old in-memory find().
const servicesService = require('../services/services.service');

const ALMOST_UP_POSITION = 2;

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
    return store.queueEntries
        .filter(ticket => ticket.serviceId === serviceId && ticket.status === 'waiting')
        .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
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
    const service = servicesService.findService(serviceId);
    if (!service) {
        throw new ApiError(404, 'NOT_FOUND', ' service does not exist.');
    }

    // Check if the user already has an active ticket and prevent them from making another 
    const isWaiting = store.queueEntries.find((ticket) => ticket.userId === userId && ticket.status === 'waiting');
    if (isWaiting) {
        throw new ApiError(400, 'ALREADY_IN_QUEUE', 'You are already in Line');
    }

    // Create a new queue entry
    const id = nextId('queueEntries');
    const entry = {
        id,
        userId,
        serviceId,
        status: 'waiting',
        joinedAt: new Date().toISOString(),
        priority: service.priority || 'medium'
    };

    store.queueEntries.push(entry);

    const waitingList = getQueueForService(serviceId);
    const position = waitingList.findIndex(ticket => ticket.id === id) + 1; // +1 because index is 0-based
    const estimatedWaitTime = calculateWaitTime(serviceId, position);

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

    return { ticket: entry, position, estimatedWaitTime };
}

//removes user from queue and update their status to left
function leaveQueue(userId, queueEntryId) {
    const entry = store.queueEntries.find(ticket => ticket.id === queueEntryId);
    
    if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Queue entry not found');
    if (entry.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'User has wrong ticket');
    if (entry.status !== 'waiting') throw new ApiError(400, 'BAD_REQUEST', 'Queue entry is not in Line');

    const waitingList = getQueueForService(entry.serviceId);
    const position = waitingList.findIndex(ticket => ticket.id === queueEntryId) + 1;

    entry.status = 'left';

    const service = servicesService.findService(entry.serviceId);
    historyService.recordHistory({
        userId: entry.userId,
        serviceId: entry.serviceId,
        serviceName: service ? service.name : 'Unknown service',
        joinedAt: entry.joinedAt,
        outcome: 'left'
    });
    notifyQueueAdvance(entry.serviceId, position);

    return { message: 'Successfully left the queue.' };
}

//retrives status and wait time of a user individual ticket
function getQueueStatus(userId, queueEntryId) {
    const entry = store.queueEntries.find(ticket => ticket.id === queueEntryId);
    if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    if (entry.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Cannot view another users ticket');

//checking if status is waiting if not return 0 values 
    if(entry.status !== 'waiting'){
        return {ticket: entry, position: 0, estimatedWaitTimeL: 0};
    }

    const waitingList = getQueueForService(entry.serviceId);
    const position = waitingList.findIndex(ticket => ticket.id === queueEntryId) + 1;
    const estimatedWaitTime = calculateWaitTime(entry.serviceId, position);

    return { ticket: entry, position, estimatedWaitTime };
}

//moves the queue by marking the user first in line as served
function serveNext(serviceId) {
    const waitingQueue = getQueueForService(serviceId);
    if (waitingQueue.length === 0) {
        throw new ApiError(404, 'NOT_FOUND', 'No entries in the queue');
    }

    const nextUser = waitingQueue[0];
    nextUser.status = 'served';

    const service = servicesService.findService(serviceId);
    historyService.recordHistory({
        userId: nextUser.userId,
        serviceId: serviceId,
        serviceName: service ? service.name : 'Unknown service',
        joinedAt: nextUser.joinedAt,
        outcome: 'served'
    });
    notifyQueueAdvance(serviceId, 1);

    return { message: 'Next user served.', ticket: nextUser };
}

module.exports = {
    getQueueForService,
    joinQueue,
    leaveQueue,
    getQueueStatus,
    serveNext,
    calculateWaitTime
};