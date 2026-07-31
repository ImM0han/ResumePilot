function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Max size allowed is 8MB.' });
  }

  // Multer unexpected file type
  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // OpenAI-specific errors
  if (err.status === 429) {
    return res.status(429).json({ success: false, message: 'AI service rate limit reached. Please try again shortly.' });
  }
  if (err.status === 401) {
    return res.status(500).json({ success: false, message: 'AI service authentication failed. Check server OPENAI_API_KEY.' });
  }
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
    return res.status(504).json({ success: false, message: 'The request timed out. Please try again.' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error. Please try again.',
  });
}

module.exports = { errorHandler, notFoundHandler };
