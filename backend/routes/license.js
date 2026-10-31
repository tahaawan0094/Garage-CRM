const express = require('express');
const router = express.Router();
const licenseManager = require('../services/licenseManager');
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

// Get status
router.get('/status', async (req, res) => {
  try {
    const status = await licenseManager.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register garage & create owner account
router.post('/register', async (req, res) => {
  try {
    const { businessName, ownerName, username, password, phone, email, city } = req.body;

    if (!businessName || !ownerName || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Business name, owner name, username and password are required.',
      });
    }

    // 1. Create or update owner user account
    const normalizedUsername = username.toLowerCase().trim();
    const { salt, hash } = User.hashPassword(password);

    await User.deleteMany({ role: 'owner' });
    await User.create({
      username: normalizedUsername,
      fullName: ownerName.trim(),
      passwordHash: hash,
      salt,
      role: 'owner',
      phone: phone || '',
      email: email || '',
      allowedTabs: ALL_TABS,
      isActive: true,
    });

    // 2. Register business with licensing system & cloud
    const registration = await licenseManager.register({
      businessName,
      ownerName,
      phone,
      email,
      city,
      businessType: 'Auto Workshop / Garage',
    });

    const status = await licenseManager.getStatus();
    res.status(201).json({
      success: true,
      message: 'Garage successfully registered. Please activate your license.',
      registration,
      license: status.license,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Activate license with key
router.post('/activate', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a valid license key.' });
    }

    const result = await licenseManager.activate(key);
    res.json({
      success: true,
      message: 'License successfully activated!',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Refresh / Verify license
router.post('/refresh', async (req, res) => {
  try {
    const result = await licenseManager.refresh();
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Full System Registration & License Reset
router.post('/reset', async (req, res) => {
  try {
    await licenseManager.reset();
    await User.deleteMany({});
    res.json({
      success: true,
      message: 'System successfully reset to fresh unconfigured state.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

