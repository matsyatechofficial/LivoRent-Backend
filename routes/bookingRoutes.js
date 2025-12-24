const express = require("express")

const bookingRouter = express.Router();
const { bookingController } = require('../controllers/propertyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Tenant routes
bookingRouter.post(
  '/',
  authMiddleware,
  roleMiddleware('tenant'),
  bookingController.create
);

// Shared routes
bookingRouter.get(
  '/',
  authMiddleware,
  bookingController.getAll
);

bookingRouter.get(
  '/:id',
  authMiddleware,
  bookingController.getById
);

bookingRouter.delete(
  '/:id',
  authMiddleware,
  bookingController.cancel
);

// Owner routes
bookingRouter.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  bookingController.updateStatus
);

// Get booked dates
bookingRouter.get(
  '/property/:propertyId/dates',
  bookingController.getBookedDates
);

module.exports = bookingRouter;