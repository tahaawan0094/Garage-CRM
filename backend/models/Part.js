const mongoose = require('mongoose');

/**
 * Model: Part (Parts Inventory)
 * Matches frontend Part type from PartsInventory.tsx
 */

const partActivitySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: {
      type: String,
      enum: ['Restocked', 'Sold', 'Adjusted', 'Transferred'],
      required: true,
    },
    quantity: { type: Number, required: true },
    reference: { type: String, default: '' },              // e.g. WO-00012, GRN-0082
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const partSchema = new mongoose.Schema(
  {
    partId: { type: String, unique: true },                // e.g. PRT-1001
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    brand: { type: String, default: '', trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockAt: { type: Number, default: 6, min: 0 },      // Alert threshold
    unitCost: { type: Number, default: 0, min: 0 },        // Purchase price
    sellingPrice: { type: Number, default: 0, min: 0 },
    commission: { type: Number, default: 0, min: 0 },      // External part commission
    supplier: { type: String, default: '', trim: true },
    compatibility: { type: String, default: '', trim: true }, // e.g. Toyota Land Cruiser, Nissan Patrol
    partNumber: { type: String, default: '', trim: true },    // OEM Part No / SKU
    lastRestocked: { type: String, default: '' },
    lastUpdated: { type: String, default: '' },
    activity: [partActivitySchema],
  },
  { timestamps: true }
);

// Virtual: stock status
partSchema.virtual('status').get(function () {
  if (this.quantity === 0) return 'Out of Stock';
  if (this.quantity <= this.lowStockAt) return 'Low Stock';
  return 'In Stock';
});

partSchema.set('toJSON', { virtuals: true });
partSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Part', partSchema);
