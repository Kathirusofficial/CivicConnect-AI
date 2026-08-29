const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');

      if (decoded.role === 'Worker') {
        let workerDoc = await Worker.findById(decoded.id).select('-password');
        if (!workerDoc) {
          const userDoc = await User.findById(decoded.id).select('-password');
          if (userDoc) {
            if (userDoc.workerId) {
              workerDoc = await Worker.findById(userDoc.workerId).select('-password');
            }
            if (!workerDoc) {
              workerDoc = userDoc;
            }
          }
        }
        if (!workerDoc) {
          return res.status(401).json({ message: 'Worker not found, unauthorized' });
        }
        req.user = workerDoc;
        req.user.role = 'Worker';
        req.worker = workerDoc;
        return next();
      }

      // Check User model
      let userDoc = await User.findById(decoded.id).select('-password');
      if (!userDoc) {
        // Fallback: check Worker model if token was generated with worker id
        const workerDoc = await Worker.findById(decoded.id).select('-password');
        if (workerDoc) {
          req.user = workerDoc;
          req.user.role = 'Worker';
          req.worker = workerDoc;
          return next();
        }
        return res.status(401).json({ message: 'User not found, unauthorized' });
      }

      req.user = userDoc;
      return next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Government')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin/government officer' });
  }
};

const worker = (req, res, next) => {
  if (req.user && req.user.role === 'Worker') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a field worker' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, admin, worker, authorize };
