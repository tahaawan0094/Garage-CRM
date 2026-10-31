const express = require('express');
const router = express.Router();
const User = require('../models/User');

const ALL_TABS = [
  'Dashboard',
  'POS Billing',
  'New Intake',
  'Work Orders',
  'Quotations',
  'Invoices',
  'Vehicles',
  'Customers',
  'Parts Inventory',
  'Mechanics',
  'Reports',
  'Settings',
];

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This user account has been disabled. Contact owner.' });
    }

    const isMatch = user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        allowedTabs: user.role === 'owner' ? ALL_TABS : user.allowedTabs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (Owner only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash -salt').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new staff user (Owner only)
router.post('/users', async (req, res) => {
  try {
    const { username, fullName, password, role, allowedTabs, phone, email } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Username, password, and full name are required.' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this username already exists.' });
    }

    const { salt, hash } = User.hashPassword(password);
    const newUser = await User.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      passwordHash: hash,
      salt,
      role: role || 'staff',
      allowedTabs: Array.isArray(allowedTabs) && allowedTabs.length > 0 ? allowedTabs : ['Dashboard'],
      phone: phone || '',
      email: email || '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        allowedTabs: newUser.allowedTabs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user (Owner only)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, allowedTabs, isActive, password, phone, email } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (role) user.role = role;
    if (Array.isArray(allowedTabs)) user.allowedTabs = allowedTabs;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;

    if (password && password.trim().length >= 4) {
      const { salt, hash } = User.hashPassword(password);
      user.salt = salt;
      user.passwordHash = hash;
    }

    await user.save();
    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        allowedTabs: user.allowedTabs,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user (Owner only)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot delete the primary owner account.' });
    }
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

