const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const { isAuthenticated } = require('../middleware/auth');

// Get fee details for authenticated student
router.get('/details', isAuthenticated, async (req, res) => {
  try {
    const studentId = req.session.studentId;

    // Get current academic year (you can modify this logic)
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    // Find fee record
    let fee = await Fee.findOne({ 
      studentId: studentId,
      academicYear: academicYear
    }).populate('studentId', 'name rollNumber class section email');

    // If no fee record exists, return message
    if (!fee) {
      const student = await Student.findById(studentId);
      return res.json({
        success: true,
        hasFee: false,
        message: 'No fee record found for current academic year',
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        }
      });
    }

    // Get last successful transaction for receipt
    const lastTransaction = await Transaction.findOne({
      studentId: studentId,
      status: 'success'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      hasFee: true,
      fee: {
        id: fee._id,
        academicYear: fee.academicYear,
        components: fee.components,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        status: fee.status
      },
      student: {
        name: fee.studentId.name,
        rollNumber: fee.studentId.rollNumber,
        class: fee.studentId.class,
        section: fee.studentId.section
      },
      lastTransaction: lastTransaction ? {
        orderId: lastTransaction.orderId,
        amount: lastTransaction.amount,
        createdAt: lastTransaction.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error in fee details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

