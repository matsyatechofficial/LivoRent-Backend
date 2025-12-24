const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes
router.post('/signup', authController.signup);           // Tenant/Owner signup
router.post('/login', authController.login);             // Tenant/Owner login
router.post('/admin/login', authController.adminLogin); // This is correct
router.post('/refresh', authController.refreshToken);    // Refresh token

// Protected routes (require authentication)
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/logout', authMiddleware, authController.logout);

// Role-based protected routes
router.get('/tenant', authMiddleware, roleMiddleware('tenant'), authController.tenantOnly);
router.get('/owner', authMiddleware, roleMiddleware('owner'), authController.ownerOnly);
router.get('/admin', authMiddleware, roleMiddleware('admin'), authController.adminOnly);


module.exports = router;