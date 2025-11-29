const express = require('express');
const router = express.Router();
const { Cashfree } = require('cashfree-pg');
const crypto = require('crypto');
const Fee = require('../models/Fee');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const { isAuthenticated } = require('../middleware/auth');
const { generateReceipt } = require('../utils/receipt');
const { sendReceiptEmail } = require('../utils/email');

// Helper function to extract payment method string from Cashfree response
const extractPaymentMethod = (paymentMethod) => {
  if (!paymentMethod) {
    return 'Online';
  }
  
  // If it's already a string, return it
  if (typeof paymentMethod === 'string') {
    return paymentMethod;
  }
  
  // If it's an object, extract the payment method type
  if (typeof paymentMethod === 'object') {
    // Check for card payment
    if (paymentMethod.card) {
      const cardType = paymentMethod.card.card_type || 'card';
      const cardNetwork = paymentMethod.card.card_network || '';
      return cardNetwork ? `${cardNetwork}_${cardType}` : cardType;
    }
    
    // Check for UPI
    if (paymentMethod.upi) {
      return 'UPI';
    }
    
    // Check for netbanking
    if (paymentMethod.netbanking) {
      return 'Net Banking';
    }
    
    // Check for wallet
    if (paymentMethod.wallet) {
      return 'Wallet';
    }
    
    // Fallback: try to get a meaningful string from the object
    return JSON.stringify(paymentMethod).substring(0, 50);
  }
  
  return 'Online';
};

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
      },
      // Add redirect URL for payment callback
      order_meta: {
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-callback?orderId=${orderId}`,
        notify_url: `${process.env.SERVER_URL || 'http://localhost:8000'}/api/webhook/cashfree`
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
  console.log('\n========== PAYMENT VERIFICATION STARTED ==========');
  console.log(`[Payment Verify] Request received at: ${new Date().toISOString()}`);
  console.log(`[Payment Verify] Request body:`, req.body);
  console.log(`[Payment Verify] Session studentId:`, req.session.studentId);
  
  try {
    const { orderId } = req.body;

    if (!orderId) {
      console.log('[Payment Verify] ERROR: Order ID not provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    console.log(`[Payment Verify] Looking for transaction with orderId: ${orderId}`);
    
    // Find transaction
    const transaction = await Transaction.findOne({ orderId: orderId });
    
    if (!transaction) {
      console.log(`[Payment Verify] ERROR: Transaction not found for orderId: ${orderId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    console.log(`[Payment Verify] Transaction found:`);
    console.log(`  - OrderId: ${transaction.orderId}`);
    console.log(`  - Status: ${transaction.status}`);
    console.log(`  - Amount: ${transaction.amount}`);
    console.log(`  - FeeId: ${transaction.feeId}`);
    console.log(`  - StudentId: ${transaction.studentId}`);

    // If transaction is already successful, just return success (avoid duplicate updates)
    if (transaction.status === 'success') {
      console.log(`[Payment Verify] Transaction ${orderId} is already marked as success`);
      console.log(`[Payment Verify] Checking fee update for already-successful transaction`);
      
      // Still verify fee is updated correctly
      const fee = await Fee.findById(transaction.feeId);
      if (fee) {
        console.log(`[Payment Verify] Current fee: paidAmount=${fee.paidAmount}, totalAmount=${fee.totalAmount}, status=${fee.status}`);
        
        // If this transaction amount is not reflected in fee, update it
        // This handles cases where fee update might have failed previously
        const allSuccessfulTransactions = await Transaction.find({
          feeId: fee._id,
          status: 'success'
        });
        console.log(`[Payment Verify] Found ${allSuccessfulTransactions.length} successful transactions for this fee`);
        
        const totalPaidFromTransactions = allSuccessfulTransactions.reduce((sum, t) => {
          console.log(`[Payment Verify] Transaction ${t.orderId}: amount=${t.amount}`);
          return sum + t.amount;
        }, 0);
        
        console.log(`[Payment Verify] Total paid from transactions: ${totalPaidFromTransactions}`);
        
        if (Math.abs(fee.paidAmount - totalPaidFromTransactions) > 0.01) {
          console.log(`[Payment Verify] Fee paidAmount mismatch detected! Current: ${fee.paidAmount}, Expected: ${totalPaidFromTransactions}. Updating...`);
          fee.paidAmount = Math.min(totalPaidFromTransactions, fee.totalAmount);
          await fee.save();
          const updatedFee = await Fee.findById(fee._id);
          console.log(`[Payment Verify] Fee corrected: status=${updatedFee.status}, paidAmount=${updatedFee.paidAmount}, dueAmount=${updatedFee.dueAmount}`);
        } else {
          console.log(`[Payment Verify] Fee is already up to date (paidAmount=${fee.paidAmount})`);
        }
      } else {
        console.error(`[Payment Verify] Fee not found for feeId: ${transaction.feeId}`);
      }
      
      // Generate receipt and send email if not already done (FR-15, FR-18)
      try {
        const student = await Student.findById(transaction.studentId);
        const fee = await Fee.findById(transaction.feeId);
        
        if (student && fee) {
          // Generate receipt if not already generated
          if (!transaction.receiptGenerated || !transaction.receiptPath) {
            console.log(`[Payment Verify] Generating receipt for already-successful transaction: ${transaction.orderId}`);
            const receiptPath = await generateReceipt(transaction, student, fee);
            transaction.receiptPath = receiptPath;
            transaction.receiptGenerated = true;
            await transaction.save();
            console.log(`[Payment Verify] Receipt generated: ${receiptPath}`);
          }

          // Send receipt email if not already sent
          if (!transaction.receiptEmailSent && transaction.receiptPath) {
            console.log(`[Payment Verify] Sending receipt email to ${student.email}`);
            await sendReceiptEmail(
              student.email,
              student.name,
              transaction.receiptPath,
              {
                orderId: transaction.orderId,
                amount: transaction.amount,
                createdAt: transaction.createdAt
              }
            );
            transaction.receiptEmailSent = true;
            await transaction.save();
            console.log(`[Payment Verify] Receipt email sent successfully`);
          }
        }
      } catch (receiptError) {
        console.error('[Payment Verify] Error generating receipt or sending email for already-successful transaction:', receiptError);
        // Don't fail the verification if receipt generation fails
      }
      
      console.log('========== PAYMENT VERIFICATION ENDED (Already Success) ==========\n');
      return res.json({
        success: true,
        status: 'success',
        transaction: {
          orderId: transaction.orderId,
          amount: transaction.amount,
          paymentId: transaction.paymentId,
          paymentMethod: transaction.paymentMethod
        }
      });
    }
    
    console.log(`[Payment Verify] Transaction ${orderId} status is: ${transaction.status}, proceeding with Cashfree verification...`);

    // Verify with Cashfree
    try {
      console.log(`[Payment Verify] Verifying orderId: ${orderId}`);
      const response = await Cashfree.PGOrderFetchPayments('2023-08-01', orderId);
      
      console.log(`[Payment Verify] Cashfree response:`, JSON.stringify(response.data, null, 2));
      
      const payments = response.data;
      
      if (payments && payments.length > 0) {
        const payment = payments[0];
        console.log(`[Payment Verify] Payment status: ${payment.payment_status}`);
        
        // Update transaction status
        if (payment.payment_status === 'SUCCESS') {
          console.log(`[Payment Verify] Payment SUCCESS - Updating transaction and fee...`);
          transaction.status = 'success';
          transaction.paymentId = payment.payment_id;
          // Extract payment method string properly
          transaction.paymentMethod = extractPaymentMethod(payment.payment_method);
          console.log(`[Payment Verify] Extracted payment method: ${transaction.paymentMethod}`);
          await transaction.save();

          // Update fee record - ensure we don't double count
          console.log(`[Payment Verify] Finding fee with ID: ${transaction.feeId}`);
          const fee = await Fee.findById(transaction.feeId);
          if (fee) {
            console.log(`[Payment Verify] Fee found - Current: paidAmount=${fee.paidAmount}, totalAmount=${fee.totalAmount}, status=${fee.status}`);
            
            // Calculate total from all successful transactions for this fee
            const allSuccessfulTransactions = await Transaction.find({
              feeId: fee._id,
              status: 'success'
            });
            console.log(`[Payment Verify] Found ${allSuccessfulTransactions.length} successful transactions for this fee`);
            
            const totalPaidFromTransactions = allSuccessfulTransactions.reduce((sum, t) => {
              console.log(`[Payment Verify] Transaction ${t.orderId}: amount=${t.amount}`);
              return sum + t.amount;
            }, 0);
            
            console.log(`[Payment Verify] Total paid from transactions: ${totalPaidFromTransactions}`);
            
          // Update fee with calculated total
          const oldPaidAmount = fee.paidAmount;
          fee.paidAmount = Math.min(totalPaidFromTransactions, fee.totalAmount);
          console.log(`[Payment Verify] Updating fee: oldPaidAmount=${oldPaidAmount}, newPaidAmount=${fee.paidAmount}, totalAmount=${fee.totalAmount}, transactionAmount=${transaction.amount}`);
          
          // The pre-save hook will automatically update dueAmount and status
          await fee.save();
          
          // Reload fee to get updated values from pre-save hook
          const updatedFee = await Fee.findById(fee._id);
          console.log(`[Payment Verify] ✅ Fee updated successfully: status=${updatedFee.status}, paidAmount=${updatedFee.paidAmount}, dueAmount=${updatedFee.dueAmount}`);
          
          // Generate receipt and send email (FR-15, FR-18)
          try {
            const student = await Student.findById(transaction.studentId);
            if (student) {
              // Generate receipt if not already generated (FR-15)
              if (!transaction.receiptGenerated || !transaction.receiptPath) {
                console.log(`[Payment Verify] Generating receipt for orderId: ${transaction.orderId}`);
                const receiptPath = await generateReceipt(transaction, student, updatedFee);
                transaction.receiptPath = receiptPath;
                transaction.receiptGenerated = true;
                await transaction.save();
                console.log(`[Payment Verify] Receipt generated: ${receiptPath}`);
              }

              // Send receipt email if not already sent (FR-18)
              if (!transaction.receiptEmailSent && transaction.receiptPath) {
                console.log(`[Payment Verify] Sending receipt email to ${student.email}`);
                await sendReceiptEmail(
                  student.email,
                  student.name,
                  transaction.receiptPath,
                  {
                    orderId: transaction.orderId,
                    amount: transaction.amount,
                    createdAt: transaction.createdAt
                  }
                );
                transaction.receiptEmailSent = true;
                await transaction.save();
                console.log(`[Payment Verify] Receipt email sent successfully`);
              }
            }
          } catch (receiptError) {
            console.error('[Payment Verify] Error generating receipt or sending email:', receiptError);
            // Don't fail the verification if receipt generation fails
          }
        } else {
          console.error(`[Payment Verify] ❌ ERROR: Fee not found for transaction feeId: ${transaction.feeId}`);
        }

          console.log('========== PAYMENT VERIFICATION ENDED (SUCCESS) ==========\n');
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
          console.log(`[Payment Verify] Payment FAILED for orderId: ${orderId}`);
          transaction.status = 'failed';
          await transaction.save();
          
          res.json({
            success: false,
            status: 'failed',
            message: 'Payment failed'
          });
        } else {
          console.log(`[Payment Verify] Payment status is: ${payment.payment_status} (not SUCCESS or FAILED)`);
          res.json({
            success: false,
            status: 'pending',
            message: `Payment is still pending. Status: ${payment.payment_status}`
          });
        }
      } else {
        console.log(`[Payment Verify] No payments found in Cashfree response for orderId: ${orderId}`);
        res.json({
          success: false,
          status: 'pending',
          message: 'No payment found for this order'
        });
      }
    } catch (cashfreeError) {
      console.error('[Payment Verify] Cashfree verification error:', cashfreeError);
      console.error('[Payment Verify] Error details:', {
        message: cashfreeError.message,
        response: cashfreeError.response?.data,
        status: cashfreeError.response?.status
      });
      console.log('========== PAYMENT VERIFICATION ENDED (CASHFREE ERROR) ==========\n');
      res.status(500).json({ 
        success: false, 
        message: 'Error verifying payment',
        error: cashfreeError.response?.data?.message || cashfreeError.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[Payment Verify] ERROR in verify payment:', error);
    console.error('[Payment Verify] Error stack:', error.stack);
    console.log('========== PAYMENT VERIFICATION ENDED (ERROR) ==========\n');
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

