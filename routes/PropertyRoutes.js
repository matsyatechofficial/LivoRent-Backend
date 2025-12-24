const express = require('express');
const router = express.Router();
const { propertyController } = require('../controllers/propertyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', propertyController.getAll);
router.get('/featured', propertyController.getFeatured);
router.get('/nearby', propertyController.searchNearby);
router.get('/:id', propertyController.getById);

// Owner routes
router.post(
  '/',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.array('images', 10),
  propertyController.create
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.array('images', 10),
  propertyController.update
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  propertyController.delete
);

router.get(
  '/owner/me',
  authMiddleware,
  roleMiddleware('owner'),
  propertyController.getOwnerProperties
);

// Admin routes
router.patch(
  '/:id/verify',
  authMiddleware,
  roleMiddleware('admin'),
  propertyController.verifyProperty
);

module.exports = router;
