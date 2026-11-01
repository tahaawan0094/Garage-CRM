const express = require('express');
const router = express.Router();
const User = require('../models/User');
const centralDirectory = require('../services/centralDirectory');
const licenseManager = require('../services/licenseManager');
const { switchDatabase } = require('../config/db');
const mongoose = require('mongoose');

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

// Login - Works locally AND across any PC via Atlas Central Directory
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password.' });
    }

    const normalized = username.toLowerCase().trim();
    let user = await User.findOne({ username: normalized });
    let authenticated = false;

    if (user && user.verifyPassword(password)) {
      authenticated = true;
    }

    // If user is not found or not authenticated in current local database:
    // Check MongoDB Atlas Central User Directory (enables multi-PC login from ANY machine!)
    if (!authenticated) {
      const centralUser = await centralDirectory.findUser(normalized);
      if (centralUser && User.verifyPassword(password, centralUser.salt, centralUser.passwordHash)) {
        if (!centralUser.isActive) {
          return res.status(403).json({ success: false, message: 'This user account has been disabled. Contact workshop owner.' });
        }

        // Switch this PC's connection directly to that workshop's Atlas database
        const targetDb = centralUser.databaseName;
        await switchDatabase(targetDb);

        // Fetch workshop profile & license from Central Directory and persist locally on this PC
        const workshop = await centralDirectory.findWorkshop(centralUser.businessId);
        if (workshop) {
          licenseManager.persistLocalStore({
            registration: {
              businessId: workshop.businessId,
              businessName: workshop.businessName,
              businessType: workshop.businessType || 'Auto Workshop / Garage',
              databaseName: workshop.databaseName,
              ownerName: workshop.ownerName,
              phone: workshop.phone,
              email: workshop.email,
              city: workshop.city,
              status: workshop.license?.status || 'ACTIVE',
              licenseType: workshop.license?.licenseType || 'PERMANENT',
              expiresAt: workshop.license?.expiresAt,
              licenseKey: workshop.license?.licenseKey,
              companyContact: workshop.companyContact,
            },
          });
        }

        // Find or replicate user in the newly connected database
        user = await User.findOne({ username: normalized });
        if (!user) {
          user = await User.create({
            username: centralUser.username_normalized,
            fullName: centralUser.fullName,
            passwordHash: centralUser.passwordHash,
            salt: centralUser.salt,
            role: centralUser.role,
            allowedTabs: centralUser.allowedTabs,
            isActive: true,
          });
        }
        authenticated = true;
      }
    }

    if (!authenticated || !user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This user account has been disabled. Contact owner.' });
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

// Verify login password for security-protected operations (Settings save, reset, etc.)
router.post('/verify-password', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    const normalized = username.toLowerCase().trim();
    let user = await User.findOne({ username: normalized });
    let verified = false;

    if (user && user.verifyPassword(password)) {
      verified = true;
    } else {
      const centralUser = await centralDirectory.findUser(normalized);
      if (centralUser && User.verifyPassword(password, centralUser.salt, centralUser.passwordHash)) {
        verified = true;
      }
    }

    if (verified) {
      return res.json({ success: true, verified: true });
    }
    return res.status(401).json({ success: false, verified: false, message: 'Incorrect password.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
      return res.status(409).json({ success: false, message: 'A user with this username already exists in this workshop.' });
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

    // Sync user into Central Cloud Directory for multi-PC access
    const reg = (await licenseManager.getStatus()).registration;
    await centralDirectory.recordUser({
      username: normalizedUsername,
      fullName: newUser.fullName,
      passwordHash: hash,
      salt,
      role: newUser.role,
      businessId: reg?.businessId || 'default',
      databaseName: reg?.databaseName || mongoose.connection.name,
      allowedTabs: newUser.allowedTabs,
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

    // Sync updated user into Central Cloud Directory
    const reg = (await licenseManager.getStatus()).registration;
    await centralDirectory.recordUser({
      username: user.username,
      fullName: user.fullName,
      passwordHash: user.passwordHash,
      salt: user.salt,
      role: user.role,
      businessId: reg?.businessId || 'default',
      databaseName: reg?.databaseName || mongoose.connection.name,
      allowedTabs: user.allowedTabs,
      isActive: user.isActive,
    });

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
    await centralDirectory.removeUser(user.username);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
