const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const propertyModel = require('../models/propertyModel');
const propertyController = require('../controllers/propertyController_new');

// ===================== PUBLIC ROUTES =====================

// Get all active properties
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const properties = await propertyModel.getAllActive(limit, offset);
    res.json({
      success: true,
      properties,
      count: properties.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get properties by type (rent/sale)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['rent', 'sale'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid property type' });
    }
    const properties = await propertyModel.getByType(type);
    res.json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single property details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await propertyModel.getById(id);
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================== OWNER ROUTES (AUTHENTICATED) =====================

// Create new property
router.post(
  '/',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.array('images', 10),
  propertyController.create
);

// Update property
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.array('images', 10),
  propertyController.update
);

// Soft delete property
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  propertyController.delete
);

// Toggle publish/draft status
router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  propertyController.toggleStatus
);

// Get owner's properties
router.get(
  '/owner/list',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  propertyController.getOwnerProperties
);

// ===================== ADMIN ROUTES (ADMIN ONLY) =====================

// Get global statistics
router.get(
  '/admin/stats',
  authMiddleware,
  roleMiddleware('admin'),
  propertyController.getStats
);

// Get deleted properties
router.get(
  '/admin/deleted',
  authMiddleware,
  roleMiddleware('admin'),
  propertyController.getDeleted
);

// Restore deleted property
router.patch(
  '/:id/restore',
  authMiddleware,
  roleMiddleware('admin'),
  propertyController.restore
);

module.exports = router;
