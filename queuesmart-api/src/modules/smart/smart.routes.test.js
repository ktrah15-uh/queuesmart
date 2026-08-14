const request = require('supertest');
const express = require('express');
const smartRoutes = require('./smart.routes');
const smartService = require('./smart.service');

// bypass auth requirment
jest.mock('../../middleware/auth', () => ({
    requireAuth: (req, res, next) => next()
}));

// mock service
jest.mock('./smart.service');

// setup a fake express app
const app = express();
app.use(express.json());
app.use('/', smartRoutes);

// Catch errors so tests dont crash and instead return 500 status
app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Test Error' });
});

describe('Smart Routes', () => {
    //clear out mock data
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('/services/:id/insight - returns insight data', async () => {
        smartService.getInsight.mockReturnValue({ rate: 15 });
        const res = await request(app).get('/services/1/insight?position=5');
        
        expect(res.status).toBe(200);

        expect(smartService.getInsight).toHaveBeenCalledWith(1, 5);
    });

    it('/services/:id/insight - triggers catch block on error', async () => {
        const res = await request(app).get('/services/abc/insight');

        expect(res.status).toBe(500); 
    });

    it('/services/:id/best-times - get best times to join ', async () => {
        smartService.bestTimeToJoin.mockReturnValue({ quietest: 10, busiest: 14 });

        const res = await request(app).get('/services/1/best-times');
        
        expect(res.status).toBe(200);
        expect(smartService.bestTimeToJoin).toHaveBeenCalledWith(1);
    });

    it('/services/:id/best-times - triggers catch block ', async () => {
        const res = await request(app).get('/services/abc/best-times');
        expect(res.status).toBe(500);
    });

    it('/services/:id/rate - returns learned rate', async () => {

        smartService.learnServiceMinutes.mockReturnValue({ rate: 15, source: 'history' });
        const res = await request(app).get('/services/1/rate');
        
        expect(res.status).toBe(200);
        expect(smartService.learnServiceMinutes).toHaveBeenCalledWith(1);
    });

    it('/services/:id/rate - triggers catch block', async () => {
        const res = await request(app).get('/services/abc/rate');
        
        expect(res.status).toBe(500);
    });
});