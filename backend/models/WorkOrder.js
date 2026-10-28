const mongoose = require('mongoose');

/**
 * Model: WorkOrder
 * Matches frontend IntakeFormData + all charge types from NewIntake.tsx
 */

const externalPartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    supplier: { type: String, default: '' },
    originalPrice: { type: Number, required: true, min: 0 },
    commission: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const labourChargeSchema = new mongoose.Schema(
  {
    service: { type: String, required: true },
    mechanic: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    hours: { type: Number, default: null },
    rate: { type: Number, default: null },
  },
  { _id: false }
);

const additionalChargeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const inventoryPartSchema = new mongoose.Schema(
  {
    partId: { type: String, required: true },              // PRT-xxxx
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    commission: { type: Number, default: 0 },
  },
  { _id: false }
);

const workOrderSchema = new mongoose.Schema(
  {
    workOrderId: { type: String, unique: true },           // e.g. WO-00012
    date: { type: String, default: '' },
    advisor: { type: String, default: '' },
    source: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    status: {
      type: String,
      enum: ['In Progress', 'Awaiting Parts', 'Ready for Delivery', 'Completed', 'Released', 'Cancelled', 'Invoiced'],
      default: 'In Progress',
    },
    expectedDate: { type: String, default: '' },
    estimatedDate: { type: String, default: '' },
    mechanic: { type: String, default: '' },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mechanic',
      default: null,
    },
    notes: { type: String, default: '' },

    // Customer info (denormalized for display)
    customer: { type: String, default: '' },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customerPhone: { type: String, default: '' },

    // Vehicle info (denormalized for display)
    vehicle: { type: String, default: '' },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    plate: { type: String, default: '' },
    year: { type: String, default: '' },

    // Charges
    externalParts: [externalPartSchema],
    labourCharges: [labourChargeSchema],
    additionalCharges: [additionalChargeSchema],
    inventoryParts: [inventoryPartSchema],

    // Totals
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    // Service info (primary service description)
    service: { type: String, default: '' },
    detail: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkOrder', workOrderSchema);
