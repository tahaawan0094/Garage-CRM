const mongoose = require('mongoose');

/**
 * Model: Customer
 * Matches frontend Customer type from Customers.tsx
 */

const vehicleRefSchema = new mongoose.Schema(
  {
    model: { type: String, required: true },
    year: { type: String, required: true },
    plate: { type: String, required: true },
    lastService: { type: String, default: '' },
  },
  { _id: false }
);

const serviceRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    vehicle: { type: String, required: true },
    service: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true },            // e.g. CUST-001
    name: { type: String, required: true, trim: true },
    initials: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Individual', 'Fleet', 'Corporate'],
      default: 'Individual',
    },
    status: {
      type: String,
      enum: ['Active', 'VIP', 'Inactive', 'Corporate'],
      default: 'Active',
    },
    vehicleCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisit: { type: String, default: '' },
    vehicles: [vehicleRefSchema],
    history: [serviceRecordSchema],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-compute initials before saving
customerSchema.pre('save', function () {
  if (this.isModified('name') || !this.initials) {
    this.initials = (this.name || '')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
});

module.exports = mongoose.model('Customer', customerSchema);
