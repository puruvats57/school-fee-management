const express = require('express');
const router = express.Router();
const { Cashfree } = require('cashfree-pg');
const crypto = require('crypto');
const Fee = require('../models/Fee');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const { isAuthenticated } = require('../middleware/auth');

// Generate unique order ID
function generateOrderId() {
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256');
  hash.update(uniqueId);
  const orderId = hash.digest('hex');
  return orderId.substr(0, 20);
}

// Create payment order
router.post('/create-order', isAuthenticated, async (req, res) => {
  try {
    const studentId = req.session.studentId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid amount is required' 
      });
    }

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get current academic year
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    // Find fee record
    const fee = await Fee.findOne({ 
      studentId: studentId,
      academicYear: academicYear
    });

    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee record not found' 
      });
    }

    // Validate amount doesn't exceed due amount
    if (amount > fee.dueAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Amount cannot exceed due amount of ₹${fee.dueAmount}` 
      });
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Create transaction record
    const transaction = new Transaction({
      orderId: orderId,
      studentId: studentId,
      feeId: fee._id,
      amount: amount,
      status: 'pending'
    });

    await transaction.save();

    // Create Cashfree order
    const request = {
      order_amount: amount,
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: student.rollNumber,
        customer_phone: student.phone || '9999999999',
        customer_name: student.name,
        customer_email: student.email
      }
    };

    try {
      const response = await Cashfree.PGCreateOrder('2023-08-01', request);
      
      // Update transaction with payment session ID
      transaction.paymentSessionId = response.data.payment_session_id;
      transaction.cashfreeOrderId = response.data.order_id;
      await transaction.save();

      res.json({
        success: true,
        paymentSessionId: response.data.payment_session_id,
        orderId: orderId,
        amount: amount
      });
    } catch (cashfreeError) {
      console.error('Cashfree error:', cashfreeError);
      transaction.status = 'failed';
      await transaction.save();
      
      res.status(500).json({ 
        success: false, 
        message: 'Error creating payment order',
        error: cashfreeError.response?.data?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in create-order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Verify payment
router.post('/verify', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    // Find transaction
    const transaction = await Transaction.findOne({ orderId: orderId });
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Verify with Cashfree
    try {
      const response = await Cashfree.PGOrderFetchPayments('2023-08-01', orderId);
      
      const payments = response.data;
      
      if (payments && payments.length > 0) {
        const payment = payments[0];
        
        // Update transaction status
        if (payment.payment_status === 'SUCCESS') {
          transaction.status = 'success';
          transaction.paymentId = payment.payment_id;
          transaction.paymentMethod = payment.payment_method;
          await transaction.save();

          // Update fee record
          const fee = await Fee.findById(transaction.feeId);
          if (fee) {
            fee.paidAmount += transaction.amount;
            await fee.save();
          }

          res.json({
            success: true,
            status: 'success',
            transaction: {
              orderId: transaction.orderId,
              amount: transaction.amount,
              paymentId: transaction.paymentId,
              paymentMethod: transaction.paymentMethod
            }
          });
        } else if (payment.payment_status === 'FAILED') {
          transaction.status = 'failed';
          await transaction.save();
          
          res.json({
            success: false,
            status: 'failed',
            message: 'Payment failed'
          });
        } else {
          res.json({
            success: false,
            status: 'pending',
            message: 'Payment is still pending'
          });
        }
      } else {
        res.json({
          success: false,
          status: 'pending',
          message: 'No payment found for this order'
        });
      }
    } catch (cashfreeError) {
      console.error('Cashfree verification error:', cashfreeError);
      res.status(500).json({ 
        success: false, 
        message: 'Error verifying payment',
        error: cashfreeError.response?.data?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in verify payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

