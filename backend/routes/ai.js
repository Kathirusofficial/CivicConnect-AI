const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/aiService');

// @route   POST /api/ai/classify-complaint
// @desc    Analyze and classify complaint using AI with fallback
// @access  Protected
router.post('/classify-complaint', protect, async (req, res) => {
  try {
    const { title, description, category, address, landmark, priority } = req.body;

    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(422).json({
        success: false,
        message: 'Title and description are required for AI classification.'
      });
    }

    const classification = await aiService.classifyComplaint({
      title: title.trim(),
      description: description.trim(),
      category: category ? category.trim() : '',
      address: address ? address.trim() : '',
      landmark: landmark ? landmark.trim() : '',
      priority: priority ? priority.trim() : ''
    });

    return res.status(200).json({
      success: true,
      data: classification
    });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({
        success: false,
        message: err.message
      });
    }

    console.error('Error in /api/ai/classify-complaint:', err);
    // Never fail citizen workflow - return safe fallback if unexpected error
    const fallback = aiService.getSafeFallback({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority
    });

    return res.status(200).json({
      success: true,
      data: fallback
    });
  }
});

// @route   POST /api/ai/check-duplicate
// @desc    Perform two-stage duplicate detection on complaints
// @access  Protected
router.post('/check-duplicate', protect, async (req, res) => {
  try {
    const { title, description, category, address, landmark, latitude, longitude } = req.body;

    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(422).json({
        success: false,
        message: 'Title and description are required for duplicate checking.'
      });
    }

    const result = await aiService.checkDuplicateComplaint({
      title: title.trim(),
      description: description.trim(),
      category: category ? category.trim() : '',
      address: address ? address.trim() : '',
      landmark: landmark ? landmark.trim() : '',
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({
        success: false,
        message: err.message
      });
    }

    console.error('Error in /api/ai/check-duplicate:', err);
    // Never fail citizen workflow - return safe non-duplicate response on unexpected error
    return res.status(200).json({
      success: true,
      data: {
        possibleDuplicate: false,
        strongDuplicate: false,
        matches: []
      }
    });
  }
});

module.exports = router;
