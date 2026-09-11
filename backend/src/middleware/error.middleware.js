function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
}

function errorHandler(error, req, res, _next) {
  console.error("❌ API Error:", {
    message: error.message,
    method: req.method,
    path: req.originalUrl,
    stack:
      process.env.NODE_ENV === "production"
        ? undefined
        : error.stack,
  });

  if (res.headersSent) {
    return;
  }

  const status =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  return res.status(status).json({
    success: false,
    message:
      status === 500 &&
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};