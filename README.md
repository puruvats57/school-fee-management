# School Fee Management Portal

A comprehensive online portal for students to view their fee breakup and pay school fees using Cashfree payment gateway.

## Features

- **Student Authentication**: Roll number login with OTP verification via email
- **Fee Management**: View detailed fee breakdown and payment status
- **Online Payments**: Secure payment processing through Cashfree
- **Receipt Generation**: Automatic PDF receipt generation and email delivery
- **Session Management**: Secure session-based authentication

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- Cashfree Payment Gateway
- Resend (Email service)
- PDFKit (Receipt generation)

### Frontend
- React
- React Router
- Axios
- Cashfree JS SDK

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cashfree account (sandbox/production)
- Resend account for email service

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory:
```env
MONGODB_URI=mongodb://localhost:27017/school-fee-management
CLIENT_ID=your_cashfree_client_id
CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_ENV=sandbox
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>
SESSION_SECRET=your-secret-key-change-in-production
PORT=8000
CLIENT_URL=http://localhost:5173
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The client will run on `http://localhost:5173`

## Database Models

### Student
- Roll number, name, email, class, section, phone

### Fee
- Student reference, academic year, fee components, total/paid/due amounts, status

### Transaction
- Order ID, student reference, fee reference, amount, payment status, receipt info

### OTP
- Roll number, email, hashed OTP, expiration, verification status

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to student email
- `POST /api/auth/verify-otp` - Verify OTP and create session
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/check-session` - Check current session

### Fees
- `GET /api/fees/details` - Get fee details for authenticated student

### Payment
- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/verify` - Verify payment status

### Receipt
- `GET /api/receipt/:orderId` - Get receipt details
- `GET /api/receipt/download/:orderId` - Download receipt PDF

## Usage Flow

1. **Login**: Student enters roll number
2. **OTP Verification**: OTP sent to registered email, student verifies
3. **Fee Details**: View fee breakdown and payment status
4. **Payment**: Proceed to payment if dues exist
5. **Cashfree Checkout**: Redirected to Cashfree payment page
6. **Receipt**: After successful payment, receipt is generated and emailed

## Sample Data

You'll need to populate the database with sample student and fee data. Here's a sample structure:

```javascript
// Student
{
  rollNumber: "STU001",
  name: "John Doe",
  email: "john.doe@example.com",
  class: "10",
  section: "A",
  phone: "9876543210"
}

// Fee
{
  studentId: ObjectId("..."),
  academicYear: "2024-2025",
  components: [
    { name: "Tuition Fee", amount: 50000 },
    { name: "Library Fee", amount: 2000 },
    { name: "Sports Fee", amount: 3000 }
  ],
  totalAmount: 55000,
  paidAmount: 0,
  dueAmount: 55000,
  status: "pending"
}
```

## Security Features

- OTP encryption using bcrypt
- Session-based authentication
- Protected routes with middleware
- Secure payment processing

## Environment Variables

See `server/.env.example` for all required environment variables.

## License

ISC

