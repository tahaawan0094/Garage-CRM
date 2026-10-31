const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'cashier', 'mechanic', 'staff'],
      default: 'staff',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    allowedTabs: {
      type: [String],
      default: ['Dashboard'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.statics.hashPassword = function (password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
};

UserSchema.methods.verifyPassword = function (candidatePassword) {
  const candidateHash = crypto.pbkdf2Sync(candidatePassword, this.salt, 10000, 64, 'sha512').toString('hex');
  return this.passwordHash === candidateHash;
};

module.exports = mongoose.model('User', UserSchema);

