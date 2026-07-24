/**
 * QueueSmart - Tests for the central error handler. Owner: Killian.
 */
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { ValidationError, ApiError } = require('../utils/validate');

function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

describe('errorHandler', () => {
    test('formats a ValidationError as 400 with a fields map', () => {
        const res = mockRes();
        errorHandler(new ValidationError({ email: 'bad' }), {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error).toMatchObject({
            code: 'VALIDATION_ERROR',
            fields: { email: 'bad' },
        });
    });

    test('formats an ApiError using its own status and code', () => {
        const res = mockRes();
        errorHandler(new ApiError(404, 'NOT_FOUND', 'Service not found'), {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json.mock.calls[0][0].error).toEqual({
            code: 'NOT_FOUND',
            message: 'Service not found',
        });
    });

    test('turns an unexpected error into a 500 without leaking its message', () => {
        const res = mockRes();
        errorHandler(new Error('database exploded at 10.0.0.4'), {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
        expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('10.0.0.4');
    });
});

describe('notFoundHandler', () => {
    test('returns 404 naming the method and path', () => {
        const res = mockRes();
        notFoundHandler({ method: 'GET', originalUrl: '/api/nope' }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json.mock.calls[0][0].error.message).toContain('GET /api/nope');
    });
});