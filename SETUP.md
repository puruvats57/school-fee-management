# Setup Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/school-fee-management

# Cashfree (Get from Cashfree Dashboard)
CLIENT_ID=your_cashfree_client_id
CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_ENV=sandbox

# Resend (Get from Resend Dashboard)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>

# Session
SESSION_SECRET=change-this-to-a-random-secret-key

# Server
PORT=8000
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:
```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 4. Seed Sample Data

```bash
cd server
npm run seed
```

This will create:
- 3 sample students (STU001, STU002, STU003)
- Fee records for each student

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 6. Access the Application

Open your browser and navigate to:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Testing

### Test Credentials

Use these roll numbers to test:
- **STU001**: Partial payment (₹20,000 paid, ₹40,000 due)
- **STU002**: No payment (₹60,000 due)
- **STU003**: Fully paid (₹60,000 paid)

### Testing Payment Flow

1. Enter roll number (e.g., STU002)
2. Check email for OTP (use the email from seed data)
3. Enter OTP to login
4. View fee details
5. Click "Proceed to Pay"
6. Enter amount (or use full due amount)
7. Complete payment on Cashfree sandbox
8. View receipt after successful payment

### Cashfree Sandbox Testing

For Cashfree sandbox testing:
- Use test card numbers from Cashfree documentation
- Common test card: `4111 1111 1111 1111`
- Use any future expiry date and any CVV

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify MongoDB is accessible on the specified port

### Email Not Sending
- Verify RESEND_API_KEY is correct
- Check RESEND_FROM_EMAIL format
- Ensure your Resend domain is verified

### Payment Gateway Issues
- Verify CLIENT_ID and CLIENT_SECRET
- Check CASHFREE_ENV is set to 'sandbox' for testing
- Ensure Cashfree account is active

### Session Issues
- Clear browser cookies
- Check SESSION_SECRET is set
- Verify CORS settings in server/index.js

## Production Deployment

Before deploying to production:

1. Change `CASHFREE_ENV` to `production`
2. Update `SESSION_SECRET` to a strong random string
3. Set `NODE_ENV=production`
4. Update `CLIENT_URL` to your production frontend URL
5. Use a production MongoDB instance
6. Verify your Resend domain
7. Update Cashfree credentials to production keys

## API Documentation

### Authentication Endpoints

**Send OTP**
```
POST /api/auth/send-otp
Body: { "rollNumber": "STU001" }
```

**Verify OTP**
```
POST /api/auth/verify-otp
Body: { "rollNumber": "STU001", "otp": "123456" }
```

**Logout**
```
POST /api/auth/logout
```

**Check Session**
```
GET /api/auth/check-session
```

### Fee Endpoints

**Get Fee Details**
```
GET /api/fees/details
Headers: Cookie (session)
```

### Payment Endpoints

**Create Payment Order**
```
POST /api/payment/create-order
Body: { "amount": 1000 }
Headers: Cookie (session)
```

**Verify Payment**
```
POST /api/payment/verify
Body: { "orderId": "abc123" }
Headers: Cookie (session)
```

### Receipt Endpoints

**Get Receipt**
```
GET /api/receipt/:orderId
Headers: Cookie (session)
```

**Download Receipt PDF**
```
GET /api/receipt/download/:orderId
Headers: Cookie (session)
```

## Support

For issues or questions, check the main README.md file.

