const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const { isAuthenticated } = require('../middleware/auth');
const { generateReceipt } = require('../utils/receipt');
const { sendReceiptEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');

// Generate and get receipt
router.get('/:orderId', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const studentId = req.session.studentId;

    // Find transaction
    const transaction = await Transaction.findOne({ 
      orderId: orderId,
      studentId: studentId,
      status: 'success'
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found or not successful' 
      });
    }

    // Get student and fee details
    const student = await Student.findById(studentId);
    const fee = await Fee.findById(transaction.feeId);

    if (!student || !fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student or fee record not found' 
      });
    }

    // Generate receipt if not already generated
    let receiptPath = transaction.receiptPath;
    
    if (!receiptPath || !fs.existsSync(receiptPath)) {
      receiptPath = await generateReceipt(transaction, student, fee);
      transaction.receiptPath = receiptPath;
      transaction.receiptGenerated = true;
      await transaction.save();
    }

    // Send receipt via email if not already sent
    if (!transaction.receiptEmailSent) {
      try {
        await sendReceiptEmail(
          student.email, 
          student.name, 
          receiptPath, 
          {
            orderId: transaction.orderId,
            amount: transaction.amount,
            createdAt: transaction.createdAt
          }
        );
        transaction.receiptEmailSent = true;
        await transaction.save();
      } catch (emailError) {
        console.error('Error sending receipt email:', emailError);
        // Continue even if email fails
      }
    }

    // Return receipt details
    res.json({
      success: true,
      receipt: {
        orderId: transaction.orderId,
        amount: transaction.amount,
        paymentId: transaction.paymentId,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        receiptPath: `/api/receipt/download/${orderId}`
      },
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section
      },
      fee: {
        components: fee.components,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount
      }
    });
  } catch (error) {
    console.error('Error in get receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Download receipt PDF
router.get('/download/:orderId', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const studentId = req.session.studentId;

    // Find transaction
    const transaction = await Transaction.findOne({ 
      orderId: orderId,
      studentId: studentId,
      status: 'success'
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found or not successful' 
      });
    }

    // Get student and fee details
    const student = await Student.findById(studentId);
    const fee = await Fee.findById(transaction.feeId);

    if (!student || !fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student or fee record not found' 
      });
    }

    // Generate receipt if not already generated
    let receiptPath = transaction.receiptPath;
    
    if (!receiptPath || !fs.existsSync(receiptPath)) {
      receiptPath = await generateReceipt(transaction, student, fee);
      transaction.receiptPath = receiptPath;
      transaction.receiptGenerated = true;
      await transaction.save();
    }

    // Send PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${orderId}.pdf`);
    
    const fileStream = fs.createReadStream(receiptPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error in download receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

