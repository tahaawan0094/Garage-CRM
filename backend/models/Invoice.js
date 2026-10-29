const mongoose = require('mongoose');

/**
 * Model: Invoice
 * Matches frontend Invoice type from Invoices.tsx
 */

const invoiceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, unique: true },              // e.g. INV-00152
    customer: { type: String, required: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    vehicle: { type: String, required: true },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    year: { type: String, default: '' },
    plate: { type: String, default: '' },
    workOrder: { type: String, default: '' },
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
    },
    service: { type: String, required: true },
    detail: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue', 'Partial', 'Returned', 'Partially Returned'],
      default: 'Pending',
    },
    type: {
      type: String,
      enum: ['Service', 'Parts'],
      default: 'Service',
    },
    date: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },                   // amount - discount + vat
    advisor: { type: String, default: '' },
    items: [invoiceItemSchema],
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    quotationId: {                                          // If created from quotation
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-calculate total
invoiceSchema.pre('save', function () {
  if (this.items && this.items.length > 0) {
    this.amount = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }
  this.total = Math.max(0, this.amount - this.discount + this.vat);
});

module.exports = mongoose.model('Invoice', invoiceSchema);
