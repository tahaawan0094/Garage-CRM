const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const licenseManager = require('../services/licenseManager');
const centralDirectory = require('../services/centralDirectory');

// GET /api/settings - Fetch workshop settings from active tenant database
router.get('/', async (req, res) => {
  try {
    let settingsDoc = await Setting.findOne();

    if (!settingsDoc) {
      // If no settings exist yet in this database, prefill with registered business info
      const status = await licenseManager.getStatus();
      const reg = status.registration || {};

      const initialSettings = {
        garageName: reg.businessName || 'Garage Workshop',
        facilitySubtitle: `${reg.city ? reg.city + ' ' : ''}Workshop Facility`,
        ownerName: reg.ownerName || 'Workshop Owner',
        ownerRole: 'Garage Owner',
        phone: reg.phone || '',
        whatsapp: reg.phone || '',
        email: reg.email || '',
        city: reg.city || '',
        address: reg.city || '',
        currency: reg.currency || 'USD',
        operatingHours: 'Sat – Thu: 8:00 AM – 8:00 PM (Friday Closed)',
        logoUrl: '',
        taxRate: 0,
        invoicePrefix: 'INV-',
        workOrderPrefix: 'WO-',
        quotationPrefix: 'QT-',
        quotationValidityDays: 7,
        paymentTerms: 'Due Upon Receipt',
        showLogoOnPrint: true,
        showSignatureLine: true,
        showTaxBreakdown: false,
        autoInvoiceOnApproval: true,
        invoiceFooterNotes: `Thank you for choosing ${reg.businessName || 'our workshop'}. All repairs carry workshop warranty.`,
        gatePassDisclaimer: 'The vehicle has passed safety verification inspection and is authorized for release from workshop bays.',
        printerMode: 'windows',
        paperSize: '80mm',
        autoPrint: true,
      };

      return res.json({
        success: true,
        settings: initialSettings,
        services: [],
      });
    }

    res.json({
      success: true,
      settings: settingsDoc,
      services: settingsDoc.servicesCatalog || [],
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings - Save or update workshop settings in active tenant database & sync to Cloud Central Directory
router.post('/', async (req, res) => {
  try {
    const { settings = {}, services = [] } = req.body;

    const payload = {
      ...settings,
      servicesCatalog: Array.isArray(services) ? services : [],
    };

    const updatedDoc = await Setting.findOneAndUpdate(
      {},
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync workshop name and logo to MongoDB Atlas Central Directory so other PCs/laptops get it
    try {
      const status = await licenseManager.getStatus();
      if (status.registration?.businessId) {
        await centralDirectory.updateWorkshopSettings(status.registration.businessId, {
          businessName: updatedDoc.garageName || status.registration.businessName,
          logoUrl: updatedDoc.logoUrl || '',
          ownerName: updatedDoc.ownerName || status.registration.ownerName,
          phone: updatedDoc.phone || status.registration.phone,
          city: updatedDoc.city || status.registration.city,
        });

        // Also update local store cache if businessName changed
        if (updatedDoc.garageName && updatedDoc.garageName !== status.registration.businessName) {
          licenseManager.persistLocalStore({
            registration: {
              ...status.registration,
              businessName: updatedDoc.garageName,
            },
          });
        }
      }
    } catch (centralErr) {
      console.warn('Notice: Central directory sync for settings:', centralErr.message);
    }

    res.json({
      success: true,
      message: 'Settings updated successfully across cloud database.',
      settings: updatedDoc,
      services: updatedDoc.servicesCatalog || [],
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

