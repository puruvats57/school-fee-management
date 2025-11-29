const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  components: [feeComponentSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  dueAmount: {
    type: Number,
    default: function() {
      return this.totalAmount;
    },
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

feeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.dueAmount = this.totalAmount - this.paidAmount;
  
  if (this.paidAmount === 0) {
    this.status = 'pending';
  } else if (this.paidAmount < this.totalAmount) {
    this.status = 'partial';
  } else {
    this.status = 'paid';
  }
  
  next();
});

module.exports = mongoose.model('Fee', feeSchema);

