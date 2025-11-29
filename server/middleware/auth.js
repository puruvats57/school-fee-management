// Middleware to check if student is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.studentId) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    message: 'Unauthorized. Please login first.' 
  });
};

// Middleware to check if admin is authenticated
const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    message: 'Unauthorized. Admin access required.' 
  });
};

module.exports = { isAuthenticated, isAdminAuthenticated };

