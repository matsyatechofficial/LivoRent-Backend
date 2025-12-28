const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController_new');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

// Get all active properties
router.get('/', propertyController.getAll);

// Get properties by type (rent/sale)
router.get('/type/:type', propertyController.getByType);

// Get single property
router.get('/:id', propertyController.getById);

// =============================================
// OWNER ROUTES (Require authentication)
// =============================================

// Get owner's properties
router.get('/owner/list', authMiddleware, propertyController.getOwnerProperties);

// Create property
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'admin']),
  upload.array('images', 10),
  propertyController.create
);

// Update property
router.put(
  '/:id',
  authMiddleware,
  upload.array('images', 10),
  propertyController.update
);

// Delete property (soft delete)
router.delete('/:id', authMiddleware, propertyController.delete);

// Toggle property status (publish/unpublish)
router.patch(
  '/:id/status',
  authMiddleware,
  propertyController.toggleStatus
);

// =============================================
// ADMIN ROUTES (Require admin role)
// =============================================

// Get dashboard statistics
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), propertyController.getStats);

// Get deleted properties
router.get('/admin/deleted', authMiddleware, roleMiddleware(['admin']), propertyController.getDeleted);

// Restore deleted property
router.patch(
  '/:id/restore',
  authMiddleware,
  roleMiddleware(['admin']),
  propertyController.restore
);

module.exports = router;
