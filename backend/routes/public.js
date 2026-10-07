const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');

/**
 * GET /api/public/stats
 * Public endpoint to fetch real database statistics for landing/home page
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalComplaints, totalCitizens, resolvedComplaints] = await Promise.all([
      Complaint.countDocuments(),
      User.countDocuments({ role: { $in: ['Citizen', 'citizen'] } }),
      Complaint.countDocuments({ status: { $in: ['Resolved', 'SOLVED'] } })
    ]);

    res.json({
      success: true,
      totalComplaints,
      totalCitizens,
      resolvedComplaints,
      data: {
        totalComplaints,
        totalCitizens,
        resolvedComplaints
      }
    });
  } catch (error) {
    console.error('Error fetching public statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public statistics',
      error: error.message
    });
  }
});

module.exports = router;
