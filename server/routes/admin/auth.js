const express = require('express');
const router = express.Router();
const Admin = require('../../models/Admin');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find admin by username
    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create admin session
    req.session.adminId = admin._id.toString();
    req.session.adminUsername = admin.username;
    req.session.adminName = admin.name;
    req.session.role = admin.role;

    res.json({ 
      success: true, 
      message: 'Login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Check admin session
router.get('/check-session', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({ 
      success: true, 
      authenticated: true,
      adminId: req.session.adminId,
      username: req.session.adminUsername,
      name: req.session.adminName,
      role: req.session.role
    });
  } else {
    res.json({ 
      success: false, 
      authenticated: false 
    });
  }
});

module.exports = router;

