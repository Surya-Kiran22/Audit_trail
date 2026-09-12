export function errorHandler(err, req, res, next) {
  // Handle expected operational domain errors cleanly without dumping noisy stack traces

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'ValidationError',
      details: err.errors
    });
  }

  if (err.name === 'ConcurrencyError' || err.code === 'ConcurrencyConflict') {
    console.log(`[OCC Notice] 409 Conflict returned to client: ${err.message}`);
    return res.status(409).json({
      error: 'ConcurrencyConflict',
      currentVersion: err.currentVersion,
      expectedVersion: err.expectedVersion,
      message: err.message || 'Concurrency conflict detected'
    });
  }

  if (err.status === 404 || err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'NotFound',
      message: err.message || 'Resource not found'
    });
  }

  if (err.status === 400 || err.name === 'BadRequestError') {
    return res.status(400).json({
      error: 'BadRequest',
      message: err.message || 'Bad request'
    });
  }

  // Only log unexpected internal 500 errors with full stack trace
  console.error('[500 Internal Error Caught]:', err);

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  });
}
