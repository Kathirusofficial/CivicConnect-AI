const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Worker = require('../models/Worker');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

// Generate Token
const generateToken = (id, role = null) => {
  const payload = { id };
  if (role) payload.role = role;
  return jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', {
    expiresIn: '30d',
  });
};

// Register Citizen / Admin
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, mobile, avatar } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Normalize role
    let userRole = 'Citizen';
    if (role) {
      const lowerRole = role.toLowerCase();
      if (lowerRole === 'admin') userRole = 'Admin';
      else if (lowerRole === 'government') userRole = 'Government';
      else if (lowerRole === 'worker') userRole = 'Worker';
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      mobile: mobile ? mobile.trim() : undefined,
      avatar: avatar || undefined
    });

    res.status(201).json({
      message: 'User registered successfully',
      token: generateToken(newUser._id, newUser.role),
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        mobile: newUser.mobile,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login Citizen / Admin / Government
router.post('/login', async (req, res) => {
  try {
    const { email, password, role: expectedRole, portal } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Role spoofing guard
    const targetPortal = (portal || expectedRole || '').toLowerCase();
    if (targetPortal === 'government' || targetPortal === 'admin') {
      if (user.role === 'Citizen') {
        return res.status(403).json({ message: 'Access denied: This account is registered as a Citizen. Please use the Citizen Portal login.' });
      }
      if (user.role === 'Worker') {
        return res.status(403).json({ message: 'Access denied: Worker accounts must use the Field Worker Portal login.' });
      }
    } else if (targetPortal === 'citizen') {
      if (user.role === 'Admin' || user.role === 'Government') {
        return res.status(403).json({ message: 'Access denied: Government accounts must use the Government Portal login.' });
      }
      if (user.role === 'Worker') {
        return res.status(403).json({ message: 'Access denied: Worker accounts must use the Field Worker Portal login.' });
      }
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        avatar: user.avatar,
        state: user.state,
        city: user.city,
        address: user.address,
        pinCode: user.pinCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Worker Login Endpoint
router.post('/worker-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Worker email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check Worker collection
    let workerDoc = await Worker.findOne({ email: cleanEmail }).populate('department');
    
    if (workerDoc) {
      const isMatch = await workerDoc.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid worker credentials' });
      }

      const token = generateToken(workerDoc._id, 'Worker');
      return res.json({
        success: true,
        message: 'Worker authentication successful',
        token,
        user: {
          _id: workerDoc._id,
          name: workerDoc.name,
          email: workerDoc.email,
          employeeId: workerDoc.employeeId || `EMP-${workerDoc._id.toString().slice(-6).toUpperCase()}`,
          department: workerDoc.department?.name || workerDoc.department,
          contact: workerDoc.contact,
          role: 'Worker',
          status: workerDoc.status,
          avatar: workerDoc.avatar
        }
      });
    }

    // 2. Fallback: check User collection for Worker role
    const userWorker = await User.findOne({ email: cleanEmail, role: 'Worker' });
    if (userWorker) {
      const isMatch = await userWorker.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid worker credentials' });
      }

      const token = generateToken(userWorker._id, 'Worker');
      return res.json({
        success: true,
        message: 'Worker authentication successful',
        token,
        user: {
          _id: userWorker._id,
          name: userWorker.name,
          email: userWorker.email,
          role: 'Worker',
          mobile: userWorker.mobile,
          avatar: userWorker.avatar
        }
      });
    }

    return res.status(401).json({ message: 'Invalid worker credentials' });
  } catch (error) {
    console.error('Worker login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Current User Profile (protected)
router.get('/me', protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile (protected)
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.mobile !== undefined) user.mobile = req.body.mobile.trim();
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
    if (req.body.state !== undefined) user.state = req.body.state.trim();
    if (req.body.city !== undefined) user.city = req.body.city.trim();
    if (req.body.address !== undefined) user.address = req.body.address.trim();
    if (req.body.pinCode !== undefined) user.pinCode = req.body.pinCode.trim();

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        avatar: user.avatar,
        state: user.state,
        city: user.city,
        address: user.address,
        pinCode: user.pinCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password (protected)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password does not match' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
