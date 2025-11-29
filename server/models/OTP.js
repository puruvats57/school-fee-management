const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  hashedOtp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash OTP before saving
otpSchema.pre('save', async function(next) {
  if (!this.isModified('hashedOtp')) {
    return next();
  }
  this.hashedOtp = await bcrypt.hash(this.hashedOtp, 10);
  next();
});

// Method to verify OTP
otpSchema.methods.verifyOtp = async function(otp) {
  return await bcrypt.compare(otp, this.hashedOtp);
};

// Clean up expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);

