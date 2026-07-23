/**
 * QueueSmart - Central error handler. Owner: Killian.
 * Nobody formats errors by hand. In a route, just:
 *   next(new ApiError(404, 'NOT_FOUND', 'Service not found'));
 *
 * Every error response in the API looks like:
 *   { "error": { "code": "...", "message": "...", "fields": { ... } } }
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        fields: err.fields,
      },
    });
  }

  if (err.name === 'ApiError') {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  if (process.env.NODE_ENV !== 'test') console.error(err);

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };