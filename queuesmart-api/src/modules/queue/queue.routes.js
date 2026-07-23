/**
 * QueueSmart - Queue Management + wait-time estimation. OWNER: ALAN.
 * Mounted at /api/queue. Replace the 501 below with real routes.
 *
 * You also own the shared queue structure. Please export the functions Andres
 * calls (at least getQueueForService(serviceId) and serveNext(serviceId)) from a
 * queue.service.js in this folder, and put their signatures in API_CONTRACT.md.
 *
 * Reuse:
 *   const { validateBody, ApiError } = require('../../utils/validate');
 *   const { requireAuth } = require('../../middleware/auth'); {}
 *   const { store, nextId } = require('../../data/store');  // store.queueEntries
 *
 * Use req.user.id as the acting user - never a userId from the body.
 * A3 wait-time stays simple: peopleAhead * service.expectedDuration.
 */

const express = require('express');
const { ApiError, validateBody } = require('../../utils/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const queueService = require('./queue.service');

const router = express.Router();

// allows a user to join the waiting queue
router.post('/join', requireAuth, validateBody({ serviceId: {type: 'integer', required: true} }), (req, res, next) => {
    try{
        const result = queueService.joinQueue(req.user.id, req.data.serviceId);
        res.status(201).json(result)
    } catch (error){
        next(error);
    }
});

// allows a user to leave a queue they are waiting for 
router.post('/leave', requireAuth, validateBody({ queueEntryId: {type: 'integer', required: true} }), (req, res, next) => {
    try{
        const result = queueService.leaveQueue(req.user.id, req.data.queueEntryId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/status/:queueEntryId', requireAuth, (req,res,next) =>{
    try{
        const entryId = parseInt(req.params.queueEntryId);
        const result = queueService.getQueueStatus(req.user.id, entryId);
        res.json(result);
    } catch (error){
        next(error);
    }
});

//admin call to view the entire queue for an individual service
router.get('/admin/:serviceId', requireAuth, requireRole('admin'), (req,res,next) => {
    try {
        const serviceId = parseInt(req.params.serviceId);
        const result = queueService.getQueueForService(serviceId);
        res.json(result);
    } catch (error){
        next(error);
    }
});

//admin call for the next user in line for an individual service
router.post('/admin/:serviceId/serve', requireAuth, requireRole('admin'), (req,res,next) => {
    try{
        const serviceId = parseInt(req.params.serviceId);
        const result = queueService.serveNext(serviceId);
        res.json(result);
    } catch (error){
        next(error);
    }
});

module.exports = router;