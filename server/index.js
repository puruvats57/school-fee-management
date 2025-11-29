const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { Cashfree } = require('cashfree-pg');
const connectDB = require('./config/database');

require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Cashfree configuration
Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'production' 
  ? Cashfree.Environment.PRODUCTION 
  : Cashfree.Environment.SANDBOX;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/receipt', require('./routes/receipt'));
app.use('/api/webhook', require('./routes/webhook'));

// Admin Routes
app.use('/api/admin/auth', require('./routes/admin/auth'));
app.use('/api/admin/students', require('./routes/admin/students'));
app.use('/api/admin/fees', require('./routes/admin/fees'));
app.use('/api/admin/transactions', require('./routes/admin/transactions'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'School Fee Management Portal API',
    status: 'running'
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});