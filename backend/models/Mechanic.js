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

const salarySlipSchema = new mongoose.Schema(
  {
    slipNo: { type: String, required: true },
    month: { type: String, required: true }, // e.g. "October 2026"
    baseSalary: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    paymentDate: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Cheque'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Paid',
    },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const mechanicSchema = new mongoose.Schema(
  {
    mechanicId: { type: String, unique: true },             // e.g. MEC-1001
    name: { type: String, required: true, trim: true },
    initials: { type: String, default: '' },
    nationalId: { type: String, default: '' },             // QID / National ID
    role: {
      type: String,
      required: true,
    },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true },
    baseSalary: { type: Number, default: 4500 },           // Monthly Base Salary in QAR
    commissionRate: { type: Number, default: 0 },          // Commission %
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
    joiningDate: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    assignedJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    experience: { type: Number, default: 3 },              // Years
    notes: { type: String, default: '' },
    assignments: [assignmentSchema],
    salaryHistory: [salarySlipSchema],
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
