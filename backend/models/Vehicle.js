const mongoose = require('mongoose');

/**
 * Model: Vehicle
 * Matches frontend Vehicle type from Vehicles.tsx
 */

const serviceRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    job: { type: String, required: true },
    mileage: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, unique: true },              // e.g. VEH-0052
    plate: { type: String, required: true, trim: true },
    customer: { type: String, required: true, trim: true }, // Customer name (denormalized for quick display)
    customerId: {                                           // Reference to Customer document
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    phone: { type: String, default: '' },
    model: { type: String, required: true, trim: true },
    year: { type: String, required: true },
    mileage: { type: String, default: '0' },
    lastService: { type: String, default: '' },
    nextService: { type: String, default: '' },
    status: {
      type: String,
      enum: ['In Service', 'Ready', 'Due', 'Archived'],
      default: 'Due',
    },
    advisor: { type: String, default: '' },
    fuel: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
      default: 'Petrol',
    },
    color: { type: String, default: '' },
    chassisNumber: { type: String, default: '', trim: true },
    engineNumber: { type: String, default: '', trim: true },
    vehicleType: { type: String, default: '' },
    bodyType: { type: String, default: '' },
    fuelType: { type: String, default: 'Petrol' },
    transmission: { type: String, default: '' },
    registrationExpiry: { type: String, default: '' },
    insuranceExpiry: { type: String, default: '' },
    notes: { type: String, default: '' },
    history: [serviceRecordSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
