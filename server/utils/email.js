const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp, studentName) => {
  try {
    // Use onboarding@resend.dev for development (works with any email)
    // For production, use verified domain from RESEND_FROM_EMAIL
    const fromEmail = process.env.NODE_ENV === 'production' && process.env.RESEND_FROM_EMAIL
      ? process.env.RESEND_FROM_EMAIL
      : 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'OTP for School Fee Portal Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${studentName},</h2>
          <p>Your OTP for logging into the School Fee Portal is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email from School Fee Management Portal.</p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendOTPEmail:', error);
    throw error;
  }
};

const sendReceiptEmail = async (email, studentName, receiptPath, transactionDetails) => {
  try {
    const fs = require('fs');
    
    // Use onboarding@resend.dev for development (works with any email)
    // For production, use verified domain from RESEND_FROM_EMAIL
    const fromEmail = process.env.NODE_ENV === 'production' && process.env.RESEND_FROM_EMAIL
      ? process.env.RESEND_FROM_EMAIL
      : 'onboarding@resend.dev';
    
    let attachments = [];
    if (receiptPath && fs.existsSync(receiptPath)) {
      const fileContent = fs.readFileSync(receiptPath);
      attachments = [
        {
          filename: `receipt_${transactionDetails.orderId}.pdf`,
          content: fileContent
        }
      ];
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Payment Receipt - School Fee Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${studentName},</h2>
          <p>Your payment has been successfully processed!</p>
          <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #333; margin-top: 0;">Payment Details:</h3>
            <p><strong>Order ID:</strong> ${transactionDetails.orderId}</p>
            <p><strong>Amount Paid:</strong> ₹${transactionDetails.amount}</p>
            <p><strong>Payment Date:</strong> ${new Date(transactionDetails.createdAt).toLocaleString('en-IN')}</p>
            <p><strong>Payment Status:</strong> <span style="color: green;">Success</span></p>
          </div>
          <p>Please find your receipt attached to this email.</p>
          <p>You can also download it from the portal.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email from School Fee Management Portal.</p>
        </div>
      `,
      attachments: attachments
    });

    if (error) {
      console.error('Error sending receipt email:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendReceiptEmail:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail, sendReceiptEmail };

