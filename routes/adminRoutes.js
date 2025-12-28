const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { Property } = require('../models/propertyModel');

// GET /api/admin/stats
router.get('/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const counts = await Property.getAdminCounts();
    res.json({ stats: counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
