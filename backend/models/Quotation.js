const mongoose = require('mongoose');

/**
 * Model: Quotation
 * Matches frontend Quote type from Quotations.tsx
 */

const quoteItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationId: { type: String, unique: true },            // e.g. QT-00018
    customer: { type: String, required: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    vehicle: { type: String, required: true },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    year: { type: String, default: '' },
    plate: { type: String, default: '' },
    service: { type: String, required: true },
    detail: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Awaiting Approval', 'Approved', 'Draft', 'Rejected', 'Expired', 'Pending', 'Pending Approval'],
      default: 'Awaiting Approval',
    },
    date: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    advisor: { type: String, default: '' },
    items: [quoteItemSchema],
    notes: { type: String, default: '' },
    validUntil: { type: String, default: '' },
    workOrderId: {                                          // If converted to work order
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-calculate amount from items
quotationSchema.pre('save', function () {
  if (this.items && this.items.length > 0) {
    this.amount = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }
});

module.exports = mongoose.model('Quotation', quotationSchema);
