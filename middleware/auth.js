const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
      next();
    } else {
      res.status(403).send('Access denied. Admin only.');
    }
  };
  
  module.exports = { isAdmin };