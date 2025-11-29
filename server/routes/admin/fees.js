const express = require('express');
const router = express.Router();
const Fee = require('../../models/Fee');
const Student = require('../../models/Student');
const { isAdminAuthenticated } = require('../../middleware/auth');

// Get all fees
router.get('/', isAdminAuthenticated, async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('studentId', 'name rollNumber class section email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      fees: fees
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get fee by ID
router.get('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('studentId', 'name rollNumber class section email');
    
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee record not found' 
      });
    }

    res.json({
      success: true,
      fee: fee
    });
  } catch (error) {
    console.error('Error fetching fee:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get fees by student ID
router.get('/student/:studentId', isAdminAuthenticated, async (req, res) => {
  try {
    const fees = await Fee.find({ studentId: req.params.studentId })
      .populate('studentId', 'name rollNumber class section email')
      .sort({ academicYear: -1 });
    
    res.json({
      success: true,
      fees: fees
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create new fee record
router.post('/', isAdminAuthenticated, async (req, res) => {
  try {
    const { studentId, academicYear, components } = req.body;

    if (!studentId || !academicYear || !components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student ID, academic year, and fee components are required' 
      });
    }

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Calculate total amount
    const totalAmount = components.reduce((sum, comp) => {
      if (!comp.name || !comp.amount || comp.amount < 0) {
        throw new Error('Invalid fee component');
      }
      return sum + comp.amount;
    }, 0);

    // Check if fee record already exists for this student and academic year
    const existingFee = await Fee.findOne({ 
      studentId: studentId,
      academicYear: academicYear
    });

    if (existingFee) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fee record already exists for this student and academic year' 
      });
    }

    const fee = new Fee({
      studentId: studentId,
      academicYear: academicYear,
      components: components,
      totalAmount: totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      status: 'pending'
    });

    await fee.save();

    const populatedFee = await Fee.findById(fee._id)
      .populate('studentId', 'name rollNumber class section email');

    res.status(201).json({
      success: true,
      message: 'Fee record created successfully',
      fee: populatedFee
    });
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

// Update fee record
router.put('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const { components, academicYear } = req.body;

    const fee = await Fee.findById(req.params.id);
    
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee record not found' 
      });
    }

    // Update components if provided
    if (components && Array.isArray(components) && components.length > 0) {
      const totalAmount = components.reduce((sum, comp) => {
        if (!comp.name || !comp.amount || comp.amount < 0) {
          throw new Error('Invalid fee component');
        }
        return sum + comp.amount;
      }, 0);

      fee.components = components;
      fee.totalAmount = totalAmount;
      fee.dueAmount = totalAmount - fee.paidAmount;
      
      // Update status based on paid amount
      if (fee.paidAmount === 0) {
        fee.status = 'pending';
      } else if (fee.paidAmount < totalAmount) {
        fee.status = 'partial';
      } else {
        fee.status = 'paid';
      }
    }

    if (academicYear) {
      fee.academicYear = academicYear;
    }

    await fee.save();

    const populatedFee = await Fee.findById(fee._id)
      .populate('studentId', 'name rollNumber class section email');

    res.json({
      success: true,
      message: 'Fee record updated successfully',
      fee: populatedFee
    });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

// Delete fee record
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee record not found' 
      });
    }

    // Check if there are transactions for this fee
    const Transaction = require('../../models/Transaction');
    const transactions = await Transaction.find({ feeId: fee._id });

    if (transactions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete fee record with existing transactions' 
      });
    }

    await Fee.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Fee record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

