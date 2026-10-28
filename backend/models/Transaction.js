const mongoose = require('mongoose');

/**
 * Model: Transaction (POS Billing)
 * Matches frontend Invoice type from PosBilling.tsx
 */

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },           // Catalog product ID
    name: { type: String, required: true },
    detail: { type: String, default: '' },
    type: { type: String, enum: ['Part', 'Service'], required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0 },               // (price - discount) * quantity
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true },         // e.g. INV-00152 (POS invoices)
    customer: {
      name: { type: String, required: true },
      phone: { type: String, default: '' },
      vehicle: { type: String, default: '' },
      plate: { type: String, default: '' },
    },
    workOrder: { type: String, default: '' },
    items: [cartItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    payment: {
      type: String,
      enum: ['Cash', 'Card', 'Bank'],
      default: 'Cash',
    },
    received: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Paid',
    },
    mode: {
      type: String,
      enum: ['Mixed Bill', 'Parts Sale', 'Service Sale'],
      default: 'Mixed Bill',
    },
    date: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
