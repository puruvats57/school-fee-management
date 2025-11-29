const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Fee = require('../models/Fee');

// Cashfree webhook endpoint for payment status updates
router.post('/cashfree', async (req, res) => {
  try {
    const event = req.body;
    
    // Cashfree sends different event types
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK' || event.type === 'PAYMENT_USER_CONFIRMED') {
      const orderId = event.data.order?.order_id || event.data.order_id;
      
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID not found' });
      }

      // Find transaction
      const transaction = await Transaction.findOne({ orderId: orderId });
      
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // Update transaction status if not already updated
      if (transaction.status !== 'success') {
        transaction.status = 'success';
        transaction.paymentId = event.data.payment?.payment_id || event.data.payment_id;
        transaction.paymentMethod = event.data.payment?.payment_method || 'Online';
        await transaction.save();

        // Update fee record
        const fee = await Fee.findById(transaction.feeId);
        if (fee) {
          fee.paidAmount += transaction.amount;
          await fee.save();
        }
      }
    } else if (event.type === 'PAYMENT_FAILED_WEBHOOK') {
      const orderId = event.data.order?.order_id || event.data.order_id;
      
      if (orderId) {
        const transaction = await Transaction.findOne({ orderId: orderId });
        if (transaction && transaction.status === 'pending') {
          transaction.status = 'failed';
          await transaction.save();
        }
      }
    }

    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Cashfree from retrying
    res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
});

module.exports = router;

