function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const role = String(req.user.role || "").toUpperCase();

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (String(req.user.role).toUpperCase() !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }

  next();
}

module.exports = {
  requireAdmin,
  requireSuperAdmin,
};