const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      default: 'Auto Workshop / Garage',
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    deviceId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVATION_REQUIRED', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'DEVICE_RELEASED'],
      default: 'ACTIVATION_REQUIRED',
    },
    licenseType: {
      type: String,
      enum: ['PERMANENT', 'DATED'],
      default: 'PERMANENT',
    },
    licenseKey: {
      type: String,
      default: '',
    },
    keyHash: {
      type: String,
      default: '',
    },
    receipt: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    isSetupCompleted: {
      type: Boolean,
      default: true,
    },
    companyContact: {
      companyName: { type: String, default: 'Vertexia' },
      phone: { type: String, default: '+974 5511 2222' },
      whatsapp: { type: String, default: '+97455112222' },
      email: { type: String, default: 'support@vertexia.tech' },
      instructions: { type: String, default: 'Contact company support with your Registration ID to obtain or renew your license key.' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('License', LicenseSchema);

