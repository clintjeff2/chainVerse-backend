
module.exports.adminRole = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      status: "Failed",
      message: "Access denied: Only Admins have this access",
    });
  }
  next();
};
