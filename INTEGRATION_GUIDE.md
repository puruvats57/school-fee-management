# Integration Guide

This document provides detailed information about the integrated services: **Cashfree Payment Gateway** and **Resend Email Service**.

## 1. Cashfree Payment Gateway Integration

### Overview
Cashfree is fully integrated for order creation, checkout, and payment verification.

### Implementation Details

#### Backend Integration (`server/routes/payment.js`)

**1. Order Creation**
- **Endpoint**: `POST /api/payment/create-order`
- **Function**: Creates a payment order in Cashfree
- **Process**:
  - Validates payment amount
  - Creates transaction record in database
  - Calls `Cashfree.PGCreateOrder()` with order details
  - Returns `paymentSessionId` for frontend checkout

**Code Location**: `server/routes/payment.js` (lines 20-125)

```javascript
// Order creation flow
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

const response = await Cashfree.PGCreateOrder('2023-08-01', request);
```

**2. Payment Verification**
- **Endpoint**: `POST /api/payment/verify`
- **Function**: Verifies payment status with Cashfree
- **Process**:
  - Calls `Cashfree.PGOrderFetchPayments()` to get payment status
  - Updates transaction status in database
  - Updates fee record with paid amount
  - Returns payment status (success/failed/pending)

**Code Location**: `server/routes/payment.js` (lines 128-220)

```javascript
// Payment verification flow
const response = await Cashfree.PGOrderFetchPayments('2023-08-01', orderId);
// Updates transaction and fee records based on payment status
```

**3. Webhook Handler**
- **Endpoint**: `POST /api/webhook/cashfree`
- **Function**: Handles Cashfree webhook callbacks
- **Process**:
  - Receives payment status updates from Cashfree
  - Updates transaction status automatically
  - Updates fee records

**Code Location**: `server/routes/webhook.js`

#### Frontend Integration (`client/src/pages/Payment.jsx`)

**1. Cashfree SDK Initialization**
```javascript
const cashfree = await load({
  mode: 'sandbox', // or 'production'
});
```

**2. Checkout Process**
```javascript
const checkoutOptions = {
  paymentSessionId: paymentSessionId,
  redirectTarget: '_self', // or '_modal', '_blank'
};

cashfree.checkout(checkoutOptions);
```

**3. Payment Verification**
- Automatically verifies payment after checkout completion
- Redirects to receipt page on success

### Configuration

**Environment Variables** (`.env`):
```env
CLIENT_ID=your_cashfree_client_id
CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_ENV=sandbox  # or 'production'
```

**Server Configuration** (`server/index.js`):
```javascript
Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'production' 
  ? Cashfree.Environment.PRODUCTION 
  : Cashfree.Environment.SANDBOX;
```

### Payment Flow

1. **Student initiates payment** → Frontend calls `/api/payment/create-order`
2. **Backend creates Cashfree order** → Returns `paymentSessionId`
3. **Frontend initializes checkout** → Uses Cashfree JS SDK
4. **Student completes payment** → On Cashfree payment page
5. **Payment verification** → Backend verifies with Cashfree API
6. **Transaction updated** → Status saved to database
7. **Fee record updated** → Paid amount incremented
8. **Receipt generated** → PDF created and emailed

### Testing

**Sandbox Mode**:
- Use test card: `4111 1111 1111 1111`
- Any future expiry date
- Any CVV
- Test credentials from Cashfree dashboard

**Production Mode**:
- Update `CASHFREE_ENV=production`
- Use production credentials
- Configure webhook URL in Cashfree dashboard

---

## 2. Resend Email Service Integration

### Overview
Resend is fully integrated for sending OTP emails and payment receipts.

### Implementation Details

#### Email Service (`server/utils/email.js`)

**1. OTP Email**
- **Function**: `sendOTPEmail(email, otp, studentName)`
- **Purpose**: Sends 6-digit OTP for student login
- **Features**:
  - HTML formatted email
  - Large, visible OTP display
  - 10-minute validity notice
  - Professional styling

**Code Location**: `server/utils/email.js` (lines 5-36)

```javascript
const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: [email],
  subject: 'OTP for School Fee Portal Login',
  html: `...HTML template with OTP...`
});
```

**2. Receipt Email**
- **Function**: `sendReceiptEmail(email, studentName, receiptPath, transactionDetails)`
- **Purpose**: Sends payment receipt after successful payment
- **Features**:
  - HTML formatted email with payment details
  - PDF receipt attachment
  - Payment summary
  - Download link

**Code Location**: `server/utils/email.js` (lines 38-87)

```javascript
const fileContent = fs.readFileSync(receiptPath);
const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: [email],
  subject: 'Payment Receipt - School Fee Portal',
  html: `...HTML template...`,
  attachments: [{
    filename: `receipt_${orderId}.pdf`,
    content: fileContent
  }]
});
```

### Usage Points

**1. OTP Email** (`server/routes/auth.js`):
- Triggered when student requests OTP
- Called after OTP generation
- Email sent to student's registered email

**2. Receipt Email** (`server/routes/receipt.js`):
- Triggered after successful payment
- Called when receipt is generated
- PDF attached automatically

### Configuration

**Environment Variables** (`.env`):
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>
```

**Service Initialization** (`server/utils/email.js`):
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
```

### Email Templates

**OTP Email Template**:
- Professional design
- Large OTP display (32px)
- Clear instructions
- Validity period mentioned

**Receipt Email Template**:
- Payment summary
- Transaction details
- Professional formatting
- PDF attachment included

### Setup Instructions

**1. Get Resend API Key**:
- Sign up at [resend.com](https://resend.com)
- Navigate to API Keys section
- Create new API key
- Copy the key (starts with `re_`)

**2. Verify Domain** (for production):
- Add your domain in Resend dashboard
- Verify DNS records
- Use verified domain in `RESEND_FROM_EMAIL`

**3. For Development**:
- Use default `onboarding@resend.dev` sender
- No domain verification needed
- Limited to 100 emails/day

### Error Handling

Both email functions include:
- Try-catch error handling
- Console logging for debugging
- Graceful failure (doesn't break flow)
- Error messages logged for monitoring

---

## Integration Status Summary

### ✅ Cashfree Payment Gateway
- [x] Order creation implemented
- [x] Checkout integration (frontend)
- [x] Payment verification implemented
- [x] Webhook handler configured
- [x] Transaction tracking
- [x] Error handling
- [x] Sandbox/Production mode support

### ✅ Resend Email Service
- [x] OTP email sending
- [x] Receipt email with PDF attachment
- [x] HTML email templates
- [x] Error handling
- [x] Configuration management

---

## Testing Checklist

### Cashfree Testing
- [ ] Create test order
- [ ] Complete payment in sandbox
- [ ] Verify payment status
- [ ] Check transaction record update
- [ ] Verify fee record update
- [ ] Test webhook (if configured)

### Email Testing
- [ ] Send OTP email
- [ ] Verify OTP email delivery
- [ ] Complete payment
- [ ] Verify receipt email delivery
- [ ] Check PDF attachment
- [ ] Test with different email providers

---

## Troubleshooting

### Cashfree Issues

**Problem**: Order creation fails
- **Solution**: Check `CLIENT_ID` and `CLIENT_SECRET` in `.env`
- **Solution**: Verify Cashfree account is active
- **Solution**: Check network connectivity

**Problem**: Payment not verifying
- **Solution**: Wait a few seconds after payment
- **Solution**: Check Cashfree dashboard for payment status
- **Solution**: Verify webhook is configured (if using)

### Email Issues

**Problem**: Emails not sending
- **Solution**: Verify `RESEND_API_KEY` is correct
- **Solution**: Check API key has sending permissions
- **Solution**: Verify `RESEND_FROM_EMAIL` format
- **Solution**: Check Resend dashboard for errors

**Problem**: Receipt PDF not attaching
- **Solution**: Verify receipt file exists at path
- **Solution**: Check file permissions
- **Solution**: Verify PDF generation is working

---

## Production Deployment

### Cashfree Production Setup
1. Switch `CASHFREE_ENV=production`
2. Update credentials to production keys
3. Configure webhook URL in Cashfree dashboard
4. Test with small amount first

### Resend Production Setup
1. Verify your domain in Resend
2. Update `RESEND_FROM_EMAIL` with verified domain
3. Test email delivery
4. Monitor email sending limits

---

## Support & Documentation

- **Cashfree Docs**: https://docs.cashfree.com
- **Resend Docs**: https://resend.com/docs
- **Cashfree Support**: support@cashfree.com
- **Resend Support**: support@resend.com

