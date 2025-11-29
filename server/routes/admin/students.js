const express = require('express');
const router = express.Router();
const Student = require('../../models/Student');
const Fee = require('../../models/Fee');
const Transaction = require('../../models/Transaction');
const { isAdminAuthenticated } = require('../../middleware/auth');

// Get all students
router.get('/', isAdminAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNumber: 1 });
    res.json({
      success: true,
      students: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get single student by ID
router.get('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.json({
      success: true,
      student: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create new student
router.post('/', isAdminAuthenticated, async (req, res) => {
  try {
    const { rollNumber, name, email, class: studentClass, section, phone } = req.body;

    if (!rollNumber || !name || !email || !studentClass || !section) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number, name, email, class, and section are required' 
      });
    }

    // Check if roll number already exists
    const existingStudent = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student with this roll number already exists' 
      });
    }

    const student = new Student({
      rollNumber: rollNumber.trim(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      class: studentClass,
      section: section,
      phone: phone ? phone.trim() : ''
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student with this roll number or email already exists' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update student
router.put('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const { name, email, class: studentClass, section, phone } = req.body;

    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Update fields
    if (name) student.name = name.trim();
    if (email) student.email = email.toLowerCase().trim();
    if (studentClass) student.class = studentClass;
    if (section) student.section = section;
    if (phone !== undefined) student.phone = phone ? phone.trim() : '';

    await student.save();

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete student
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Check if student has fees or transactions
    const fees = await Fee.find({ studentId: student._id });
    const transactions = await Transaction.find({ studentId: student._id });

    if (fees.length > 0 || transactions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete student with existing fee records or transactions' 
      });
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

