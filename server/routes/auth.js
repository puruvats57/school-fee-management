const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/email');
const crypto = require('crypto');

// Generate OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { rollNumber } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number is required' 
      });
    }

    // Find student by roll number
    const student = await Student.findOne({ rollNumber: rollNumber.trim() });
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found with this roll number' 
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = otp; // Will be hashed in pre-save hook

    // Delete any existing OTPs for this roll number
    await OTP.deleteMany({ rollNumber: rollNumber.trim() });

    // Create new OTP record
    const otpRecord = new OTP({
      rollNumber: rollNumber.trim(),
      email: student.email,
      otp: otp,
      hashedOtp: hashedOtp
    });

    await otpRecord.save();

    // Send OTP email
    try {
      await sendOTPEmail(student.email, otp, student.name);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails (for development)
    }

    res.json({ 
      success: true, 
      message: 'OTP sent to registered email',
      email: student.email.substring(0, 3) + '***@' + student.email.split('@')[1] // Masked email
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Verify OTP and create session
router.post('/verify-otp', async (req, res) => {
  try {
    const { rollNumber, otp } = req.body;

    if (!rollNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number and OTP are required' 
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      rollNumber: rollNumber.trim(),
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }

    // Verify OTP
    const isValid = await otpRecord.verifyOtp(otp);
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find student
    const student = await Student.findOne({ rollNumber: rollNumber.trim() });
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Create session
    req.session.studentId = student._id.toString();
    req.session.rollNumber = student.rollNumber;
    req.session.studentName = student.name;

    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section
      }
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Logout
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

// Check session
router.get('/check-session', (req, res) => {
  if (req.session && req.session.studentId) {
    res.json({ 
      success: true, 
      authenticated: true,
      studentId: req.session.studentId,
      rollNumber: req.session.rollNumber,
      studentName: req.session.studentName
    });
  } else {
    res.json({ 
      success: false, 
      authenticated: false 
    });
  }
});

module.exports = router;

