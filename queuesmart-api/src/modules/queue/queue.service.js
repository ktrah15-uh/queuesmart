const { store, nextId } = require('../../data/store');  // store.queueEntries 
const { ApiError } = require('../../utils/validate');

// retrives array of user waiting for a individual service, sorting them by oldest entries first 
function getQueueForService(serviceId) {
    return store.queueEntries
        .filter(ticket => ticket.serviceId === serviceId && ticket.status === 'waiting')
        .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
}

//calculates estimated wiat time based on position
function calculateWaitTime(serviceId, position) {
    const service = store.services.find(s => s.id === serviceId);
    
    if(!service || position <= 1){
        return 0;
    }
    return (position - 1) * (service.expectedDuration || 15);
}

//adds a user to queue for a specific service
function joinQueue(userId, serviceId) {
    //makes sure service exists
    const service = store.services.find(s => s.id === serviceId);
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

    return { ticket: entry, position, estimatedWaitTime };
}

//removes user from queue and update their status to left
function leaveQueue(userId, queueEntryId) {
    const entry = store.queueEntries.find(ticket => ticket.id === queueEntryId);
    
    if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Queue entry not found');
    if (entry.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'User has wrong ticket');
    if (entry.status !== 'waiting') throw new ApiError(400, 'BAD_REQUEST', 'Queue entry is not in Line');

    entry.status = 'left';
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