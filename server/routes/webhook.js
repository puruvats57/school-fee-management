const express = require('express');
const router = express.Router();
const { Cashfree } = require('cashfree-pg');
const Transaction = require('../models/Transaction');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
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

// Cashfree webhook endpoint for payment status updates
router.post('/cashfree', async (req, res) => {
  try {
    const event = req.body;
    
    // Log webhook details for verification
    console.log('\n========== WEBHOOK RECEIVED ==========');
    console.log('[Webhook] Timestamp:', new Date().toISOString());
    console.log('[Webhook] Event Type:', event.type);
    console.log('[Webhook] Request Headers:', {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    });
    console.log('[Webhook] Payload:', JSON.stringify(event, null, 2));
    console.log('=======================================\n');
    
    // Cashfree sends different event types
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK' || event.type === 'PAYMENT_USER_CONFIRMED') {
      const orderId = event.data.order?.order_id || event.data.order_id;
      
      if (!orderId) {
        console.error('[Webhook] Order ID not found in event');
        return res.status(400).json({ success: false, message: 'Order ID not found' });
      }

      console.log(`[Webhook] Processing payment success for orderId: ${orderId}`);

      // Find transaction
      const transaction = await Transaction.findOne({ orderId: orderId });
      
      if (!transaction) {
        console.error(`[Webhook] Transaction not found for orderId: ${orderId}`);
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // Verify payment status with Cashfree API (FR-13)
      try {
        console.log(`[Webhook] Verifying payment with Cashfree API for orderId: ${orderId}`);
        const cashfreeResponse = await Cashfree.PGOrderFetchPayments('2023-08-01', orderId);
        const payments = cashfreeResponse.data;
        
        if (payments && payments.length > 0) {
          const payment = payments[0];
          console.log(`[Webhook] Cashfree payment status: ${payment.payment_status}`);
          
          // Only process if payment is actually successful
          if (payment.payment_status === 'SUCCESS') {
            // Update transaction status if not already updated (FR-14)
            if (transaction.status !== 'success') {
              console.log(`[Webhook] Updating transaction status to success`);
              transaction.status = 'success';
              transaction.paymentId = payment.payment_id || event.data.payment?.payment_id || event.data.payment_id;
              // Extract payment method string properly
              const paymentMethodFromPayment = payment.payment_method || event.data.payment?.payment_method;
              transaction.paymentMethod = extractPaymentMethod(paymentMethodFromPayment);
              console.log(`[Webhook] Extracted payment method: ${transaction.paymentMethod}`);
              await transaction.save();

              // Update fee record - ensure we don't double count (FR-14)
              const fee = await Fee.findById(transaction.feeId);
              if (fee) {
                // Calculate total from all successful transactions for this fee
                const allSuccessfulTransactions = await Transaction.find({
                  feeId: fee._id,
                  status: 'success'
                });
                const totalPaidFromTransactions = allSuccessfulTransactions.reduce((sum, t) => sum + t.amount, 0);
                
                // Update fee with calculated total
                fee.paidAmount = Math.min(totalPaidFromTransactions, fee.totalAmount);
                console.log(`[Webhook] Updating fee: paidAmount=${fee.paidAmount}, totalAmount=${fee.totalAmount}`);
                
                // The pre-save hook will automatically update dueAmount and status
                await fee.save();
                
                console.log(`[Webhook] Fee updated: status=${fee.status}, paidAmount=${fee.paidAmount}, dueAmount=${fee.dueAmount}`);
              }

              // Generate receipt and send email (FR-15, FR-18)
              try {
                const student = await Student.findById(transaction.studentId);
                const fee = await Fee.findById(transaction.feeId);
                
                if (student && fee) {
                  // Generate receipt if not already generated (FR-15)
                  if (!transaction.receiptGenerated || !transaction.receiptPath) {
                    console.log(`[Webhook] Generating receipt for orderId: ${orderId}`);
                    const receiptPath = await generateReceipt(transaction, student, fee);
                    transaction.receiptPath = receiptPath;
                    transaction.receiptGenerated = true;
                    await transaction.save();
                    console.log(`[Webhook] Receipt generated: ${receiptPath}`);
                  }

                  // Send receipt email if not already sent (FR-18)
                  if (!transaction.receiptEmailSent && transaction.receiptPath) {
                    console.log(`[Webhook] Sending receipt email to ${student.email}`);
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
                    console.log(`[Webhook] Receipt email sent successfully`);
                  }
                }
              } catch (receiptError) {
                console.error('[Webhook] Error generating receipt or sending email:', receiptError);
                // Don't fail the webhook if receipt generation fails
              }
            } else {
              console.log(`[Webhook] Transaction ${orderId} already marked as success`);
            }
          } else {
            console.log(`[Webhook] Payment status is not SUCCESS: ${payment.payment_status}`);
          }
        } else {
          console.log(`[Webhook] No payments found in Cashfree response for orderId: ${orderId}`);
        }
      } catch (cashfreeError) {
        console.error('[Webhook] Error verifying payment with Cashfree:', cashfreeError);
        // Still update transaction based on webhook event if Cashfree API call fails
        if (transaction.status !== 'success') {
          transaction.status = 'success';
          transaction.paymentId = event.data.payment?.payment_id || event.data.payment_id;
          // Extract payment method string properly
          const paymentMethodFromEvent = event.data.payment?.payment_method || 'Online';
          transaction.paymentMethod = extractPaymentMethod(paymentMethodFromEvent);
          console.log(`[Webhook] Extracted payment method (fallback): ${transaction.paymentMethod}`);
          await transaction.save();
          
          // Update fee
          const fee = await Fee.findById(transaction.feeId);
          if (fee) {
            const allSuccessfulTransactions = await Transaction.find({
              feeId: fee._id,
              status: 'success'
            });
            const totalPaidFromTransactions = allSuccessfulTransactions.reduce((sum, t) => sum + t.amount, 0);
            fee.paidAmount = Math.min(totalPaidFromTransactions, fee.totalAmount);
            await fee.save();
          }
        }
      }
    } else if (event.type === 'PAYMENT_FAILED_WEBHOOK') {
      const orderId = event.data.order?.order_id || event.data.order_id;
      
      if (orderId) {
        console.log(`[Webhook] Processing payment failed for orderId: ${orderId}`);
        const transaction = await Transaction.findOne({ orderId: orderId });
        if (transaction && transaction.status === 'pending') {
          transaction.status = 'failed';
          await transaction.save();
          console.log(`[Webhook] Transaction ${orderId} marked as failed`);
        }
      }
    }

    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Cashfree from retrying
    res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
});

module.exports = router;

