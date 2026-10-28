const mongoose = require('mongoose');

/**
 * Model: Mechanic
 * Matches frontend Mechanic type from Mechanics.tsx
 */

const assignmentSchema = new mongoose.Schema(
  {
    workOrder: { type: String, required: true },
    vehicle: { type: String, required: true },
    customer: { type: String, required: true },
    service: { type: String, required: true },
    status: {
      type: String,
      enum: ['In Progress', 'Pending', 'Completed'],
      default: 'Pending',
    },
  },
  { _id: false }
);

const mechanicSchema = new mongoose.Schema(
  {
    mechanicId: { type: String, unique: true },             // e.g. MEC-1001
    name: { type: String, required: true, trim: true },
    initials: { type: String, default: '' },
    role: {
      type: String,
      enum: [
        'Engine Specialist', 'Brake Specialist', 'AC Specialist', 'Electrical',
        'Transmission', 'Suspension', 'Diagnostics', 'Tyres & Alignment',
        'Body & Paint', 'General Repair',
      ],
      required: true,
    },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true },
    status: {
      type: String,
      enum: ['On Job', 'Available', 'Busy', 'Off Duty', 'On Leave', 'On Duty'],
      default: 'Available',
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Night'],
      default: 'Morning',
    },
    assignedJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    experience: { type: Number, default: 0 },              // Years
    notes: { type: String, default: '' },
    assignments: [assignmentSchema],
  },
  { timestamps: true }
);

mechanicSchema.pre('save', function () {
  if (this.isModified('name') || !this.initials) {
    this.initials = (this.name || '')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
});

module.exports = mongoose.model('Mechanic', mechanicSchema);
