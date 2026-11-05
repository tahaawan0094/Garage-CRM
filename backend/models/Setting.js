const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    garageName: {
      type: String,
      default: 'Garage Workshop',
      trim: true,
    },
    facilitySubtitle: {
      type: String,
      default: 'Automotive Care & Diagnostics Center',
      trim: true,
    },
    ownerName: {
      type: String,
      default: 'Workshop Owner',
      trim: true,
    },
    ownerRole: {
      type: String,
      default: 'Garage Owner',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    whatsapp: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    crNumber: {
      type: String,
      default: '',
      trim: true,
    },
    taxNumber: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    operatingHours: {
      type: String,
      default: 'Sat – Thu: 8:00 AM – 8:00 PM (Friday Closed)',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },

    taxRate: {
      type: Number,
      default: 0,
    },
    invoicePrefix: {
      type: String,
      default: 'INV-',
      trim: true,
    },
    workOrderPrefix: {
      type: String,
      default: 'WO-',
      trim: true,
    },
    quotationPrefix: {
      type: String,
      default: 'QT-',
      trim: true,
    },
    quotationValidityDays: {
      type: Number,
      default: 7,
    },
    paymentTerms: {
      type: String,
      default: 'Due Upon Receipt',
      trim: true,
    },
    showLogoOnPrint: {
      type: Boolean,
      default: true,
    },
    showSignatureLine: {
      type: Boolean,
      default: true,
    },
    showTaxBreakdown: {
      type: Boolean,
      default: false,
    },
    autoInvoiceOnApproval: {
      type: Boolean,
      default: true,
    },
    invoiceFooterNotes: {
      type: String,
      default: '',
    },
    gatePassDisclaimer: {
      type: String,
      default: '',
    },

    // Thermal / Windows Printer Defaults
    printerMode: {
      type: String,
      default: 'windows',
    },
    paperSize: {
      type: String,
      default: '80mm',
    },
    printerName: {
      type: String,
      default: '',
    },
    autoPrint: {
      type: Boolean,
      default: true,
    },

    laborHourlyRate: {
      type: Number,
      default: 150,
    },
    diagnosticFee: {
      type: Number,
      default: 200,
    },
    inspectionFee: {
      type: Number,
      default: 100,
    },
    acRechargeFee: {
      type: Number,
      default: 250,
    },
    alignmentFee: {
      type: Number,
      default: 180,
    },
    defaultCommissionRate: {
      type: Number,
      default: 5,
    },

    servicesCatalog: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', SettingSchema);

