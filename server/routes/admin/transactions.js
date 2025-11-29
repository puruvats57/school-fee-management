const express = require('express');
const router = express.Router();
const Transaction = require('../../models/Transaction');
const { isAdminAuthenticated } = require('../../middleware/auth');

// Get all transactions with filters
router.get('/', isAdminAuthenticated, async (req, res) => {
  try {
    const { status, studentId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (studentId) {
      query.studentId = studentId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await Transaction.find(query)
      .populate('studentId', 'name rollNumber class section email')
      .populate('feeId', 'academicYear totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    // Calculate summary statistics
    const totalAmount = await Transaction.aggregate([
      { $match: { ...query, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const statusCounts = await Transaction.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      transactions: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalAmount: totalAmount[0]?.total || 0,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get transaction by ID
router.get('/:id', isAdminAuthenticated, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('studentId', 'name rollNumber class section email phone')
      .populate('feeId', 'academicYear components totalAmount');
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get transactions by student ID
router.get('/student/:studentId', isAdminAuthenticated, async (req, res) => {
  try {
    const transactions = await Transaction.find({ studentId: req.params.studentId })
      .populate('studentId', 'name rollNumber class section email')
      .populate('feeId', 'academicYear totalAmount')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      transactions: transactions
    });
  } catch (error) {
    console.error('Error fetching student transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

