// backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { paymentController } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Payment routes working!' });
});

// Tenant routes - Create payment & generate QR
router.post(
  '/',
  authMiddleware,
  roleMiddleware('tenant'),
  paymentController.createPayment
);

// Get payment by booking ID
router.get(
  '/booking/:bookingId',
  authMiddleware,
  paymentController.getByBooking
);

// Get payment status
router.get(
  '/status/:payment_id',
  authMiddleware,
  paymentController.getPaymentStatus
);

// Submit payment proof
router.post(
  '/submit-proof',
  authMiddleware,
  roleMiddleware('tenant'),
  paymentController.submitProof
);

// Admin routes - Get all payments
router.get(
  '/admin/all',
  authMiddleware,
  roleMiddleware('admin'),
  paymentController.getAllPayments
);

// Admin - Verify payment
router.patch(
  '/admin/verify/:payment_id',
  authMiddleware,
  roleMiddleware('admin'),
  paymentController.verifyPayment
);

module.exports = router;