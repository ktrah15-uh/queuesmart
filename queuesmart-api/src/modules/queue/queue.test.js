const request = require('supertest');
const app = require('../../app');
const {store, resetStore} = require('../../data/store');
const {signToken} = require('../../middleware/auth');
const {calculateWaitTime} = require('./queue.service');


describe('Queue Management Module', () => {
    let userToken;
    let adminToken;
    let testUserId = 'u123'
    let testAdminId = 'a999'
    let testServiceId = 1;

    
//runs before tests and assings mock data
    beforeEach(() => {

        resetStore();

        userToken = signToken({ id: testUserId, email: 'student@uni.edu', role: 'user'});
        adminToken = signToken({ id: testAdminId, email: 'admin@uni.edu', role: 'admin'});

        store.services.push({
            id: testServiceId,
            name: 'Financial Aid',
            expectedDuration: 15,
            priority: 'high'
        });
});

describe('Wait-Time Estimation', () => {
    //verifys if wait time is 0 for 1st in line
    it('should estimate 0 wait if position is 1', () => {
        expect(calculateWaitTime(testServiceId, 1)).toBe(0);
    });

    //verifys correct estimate wait for position 3
    it('should correctly estimate wait for position 3', () => {
        expect(calculateWaitTime(testServiceId,3)).toBe(30);
    });

});

//
describe('Post /api/queue/join', () => {

    //succesfully join queue  and validates the response 
    it('should successfully join a queue and calculate position', async () => {
        
        const response = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId: testServiceId});

        expect(response.status).toBe(201);
        expect(response.body.ticket.userId).toBe(testUserId);
        expect(response.body.position).toBe(1);
    });

    //make sure a user already in queue cant get a ticket
  it('should block users from joining if they are already in a queue', async () => {

        await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId: testServiceId});

        const response2 = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId: testServiceId});

        expect(response2.status).toBe(400);
        expect(response2.body.error.code).toBe('ALREADY_IN_QUEUE');
    });
});

//makes sure that when you leave the queue your ticket doesnt stay in
describe('POST /api/queue/leave', () => {
    it('should successfully update status to "left"', async () => {
        const joinResponse = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId:testServiceId});

        const ticketId = joinResponse.body.ticket.id;

        const leaveResponse = await request (app)
        .post('/api/queue/leave')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ queueEntryId: ticketId});

        expect(leaveResponse.status).toBe(200);
        expect(store.queueEntries.find(q => q.id === ticketId).status).toBe('left');
        
    });
});

//tests admin controls over the queue
describe('Admin Operations', () => {
    it('should allow an admin to serve the next user', async () => {

        await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId: testServiceId});

        const getResponse = await request(app)
        .post(`/api/queue/admin/${testServiceId}/serve`)
        .set('Authorization', `Bearer ${adminToken}`)
       
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.ticket.status).toBe('served');
    });

    //make sure that regualr users cannot use admin controls 
it('should block a normal user from calling the serve route', async () => {
    const getResponse = await request(app) 
        .post(`/api/queue/admin/${testServiceId}/serve`)
        .set('Authorization', `Bearer ${userToken}`) 
        
    expect(getResponse.status).toBe(403);
    expect(getResponse.body.error.code).toBe('FORBIDDEN');
});
});
});
