const express = require('express');
const router = express.Router();
const licenseManager = require('../services/licenseManager');
const centralDirectory = require('../services/centralDirectory');
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

    // 1. Provision new isolated tenant database & register with cloud
    const registration = await licenseManager.register({
      businessName,
      ownerName,
      phone,
      email,
      city,
    });

    // 2. Create owner user account inside this new tenant database
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

    // 3. Sync workshop profile & owner credentials into MongoDB Atlas Central Directory
    // This allows the owner & staff to log in from ANY other computer installing this app!
    await centralDirectory.recordWorkshop({
      businessId: registration.businessId,
      businessName: registration.businessName,
      databaseName: registration.databaseName,
      ownerName: registration.ownerName,
      phone: registration.phone,
      email: registration.email,
      city: registration.city,
      businessType: registration.businessType,
      license: {
        status: 'ACTIVATION_REQUIRED',
        licenseType: 'PERMANENT',
      },
      companyContact: registration.companyContact,
    });

    await centralDirectory.recordUser({
      username: normalizedUsername,
      fullName: ownerName.trim(),
      passwordHash: hash,
      salt,
      role: 'owner',
      businessId: registration.businessId,
      databaseName: registration.databaseName,
      allowedTabs: ALL_TABS,
      isActive: true,
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

    // Sync license activation into Central Directory
    const status = await licenseManager.getStatus();
    if (status.registration?.businessId) {
      await centralDirectory.updateWorkshopLicense(status.registration.businessId, {
        status: status.license.status,
        licenseType: status.license.license_type,
        expiresAt: status.license.expires_at,
        licenseKey: key.trim().toUpperCase(),
      });
    }

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

