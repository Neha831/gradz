export function errorHandler(err, _req, res, _next) {
  if (err?.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message || 'Upload error' });
  }
  const statusCode = Number(err?.statusCode) >= 400 && Number(err?.statusCode) < 600 ? err.statusCode : 500;
  const message = err?.message || 'Internal Server Error';
  res.status(statusCode).json({ success: false, message });
}

