const { db } = require('../../data/db');
const smartService = require('./smart.service');
const bcrypt = require('bcryptjs');

//block for various tests 
describe('Smart Service Module', () => {
    let userId,serviceId1,serviceId2,queueId1,queueId2;

    beforeEach(() => {

        //wipe database before test so old test dont interfere
        db.prepare('DELETE FROM History').run();
        db.prepare('DELETE FROM QueueEntry').run();
        db.prepare('DELETE FROM Queue').run();
        db.prepare('DELETE FROM Service').run();
        db.prepare('DELETE FROM UserCredentials').run();

        //fake user for foreign key constraitns 
        const hash = bcrypt.hashSync('test', 10);

        userId = db.prepare(`INSERT INTO UserCredentials (email, passwordHash, role)VALUES 
            ('test@uh.edu', ?, 'user')`).run(hash).lastInsertRowid;

        //fake services and queues
        serviceId1 = db.prepare(`INSERT INTO Service (name, description, expectedDuration, priority)
             VALUES ('IT test', 'wifi', 15, 'low')`).run().lastInsertRowid;

        queueId1 = db.prepare(`INSERT INTO Queue (serviceId, status)
             VALUES (?, 'open')`).run(serviceId1).lastInsertRowid;

        serviceId2 = db.prepare(`INSERT INTO Service (name, description, expectedDuration, priority)  VALUES
             ('Advising Test', 'schedule', 30, 'high')`).run().lastInsertRowid;

        queueId2 = db.prepare(`INSERT INTO Queue (serviceId, status) VALUES 
            (?, 'open')`).run(serviceId2).lastInsertRowid;
    });

    it('should just use the expectedDuration if history is empty', () => {
        const res = smartService.learnServiceMinutes(serviceId1);

        //check fif results match what we think
        expect(res.rate).toBe(15);
        expect(res.source).toBe('expectedDuration');
    });

    it('calculates the rate if enough data is available', () => {
        // fake histroy
        const insert = db.prepare(`INSERT INTO History (userId, serviceId, serviceName, joinedAt, 
            endedAt, outcome) VALUES (?, ?, 'S1', ?, ?, 'served')`);
        
        //5 minute gap between users 
        insert.run(userId, serviceId1, '2026-08-13 10:00:00', '2026-08-13 10:00:00');
        insert.run(userId, serviceId1, '2026-08-13 10:05:00', '2026-08-13 10:05:00');
        insert.run(userId, serviceId1, '2026-08-13 10:10:00', '2026-08-13 10:10:00');
        insert.run(userId, serviceId1, '2026-08-13 10:15:00', '2026-08-13 10:15:00');

        const res = smartService.learnServiceMinutes(serviceId1);

        //gap is 5 minutes not the default 
        expect(res.rate).toBe(5);
        expect(res.source).toBe('history');
    });

    it('ignores gaps bigger than 2 hours which are overnight', () => {
        const insert = db.prepare(`INSERT INTO History (userId, serviceId, serviceName, joinedAt, 
            endedAt, outcome) VALUES (?, ?, 'S1', ?, ?, 'served')`);
        insert.run(userId, serviceId1, '2026-08-13 10:00:00', '2026-08-13 10:00:00');
        insert.run(userId, serviceId1, '2026-08-13 10:05:00', '2026-08-13 10:05:00');
        insert.run(userId, serviceId1, '2026-08-13 10:10:00', '2026-08-13 10:10:00');
        insert.run(userId, serviceId1, '2026-08-13 10:15:00', '2026-08-13 10:15:00');
        
       //user coming in next day with a big gap
        insert.run(userId, serviceId1, '2026-08-14 08:00:00', '2026-08-14 08:00:00'); 

        const res = smartService.learnServiceMinutes(serviceId1);

        //ignore gap
        expect(res.rate).toBe(5); 
    });

    it('returns null for recommendAlternative if doesnt save enough time ', () => {
        const qe = db.prepare(`INSERT INTO QueueEntry (queueId, userId, position, joinTime, status) VALUES 
            (?, ?, ?, ?, 'waiting')`);
        
        // 1 in queue 1 and 1 in queue2
        qe.run(queueId1, userId, 1, '2026-08-13 10:00:00'); 
        qe.run(queueId2, userId, 1, '2026-08-13 10:00:00');

        //should be null because other line is slower
        expect(smartService.recommendAlternative(serviceId1)).toBeNull();
    });

    //if invalid ID throw error
    it('throws an ApiError for an unknown service ID', () => {

        expect(() => smartService.learnServiceMinutes(9999)).toThrow('not found');
    });
});