const express = require('express');
const router = express.Router();
const EnhancedControllers = require('../controllers/enhancedControllers');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Property Routes
router.post('/properties', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.propertyController.createProperty
);

router.get('/properties/search', 
  EnhancedControllers.propertyController.searchProperties
);

router.get('/properties/nearby', 
  EnhancedControllers.propertyController.getNearbyProperties
);

router.get('/properties/owner', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.propertyController.getOwnerProperties
);

router.get('/properties/:id', 
  EnhancedControllers.propertyController.getPropertyDetails
);

router.put('/properties/:id', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.propertyController.updateProperty
);

router.delete('/properties/:id', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.propertyController.deleteProperty
);

// Booking Routes
router.post('/bookings', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.bookingController.createBooking
);

router.get('/bookings/user', 
  authMiddleware, 
  roleMiddleware(['tenant', 'owner']), 
  EnhancedControllers.bookingController.getUserBookings
);

router.put('/bookings/:bookingId/status', 
  authMiddleware, 
  roleMiddleware(['owner', 'tenant']), 
  EnhancedControllers.bookingController.updateBookingStatus
);

router.post('/bookings/check-availability', 
  EnhancedControllers.bookingController.checkAvailability
);

// Wishlist Routes
router.post('/wishlist', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.wishlistController.addToWishlist
);

router.delete('/wishlist/:propertyId', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.wishlistController.removeFromWishlist
);

router.get('/wishlist', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.wishlistController.getUserWishlist
);

router.get('/wishlist/check/:propertyId', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.wishlistController.checkWishlist
);

// Inquiry Routes
router.post('/inquiries', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.inquiryController.createInquiry
);

router.get('/inquiries/owner', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.inquiryController.getOwnerInquiries
);

router.put('/inquiries/:inquiryId/status', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.inquiryController.updateInquiryStatus
);

// Review Routes
router.post('/reviews', 
  authMiddleware, 
  roleMiddleware(['tenant']), 
  EnhancedControllers.reviewController.createReview
);

router.get('/properties/:propertyId/reviews', 
  EnhancedControllers.reviewController.getPropertyReviews
);

// Maps Routes
router.get('/maps/nearby-places', 
  EnhancedControllers.mapsController.getNearbyPlaces
);

router.get('/maps/geocode', 
  EnhancedControllers.mapsController.geocodeAddress
);

// Analytics Routes
router.get('/analytics/platform', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.analyticsController.getPlatformAnalytics
);

router.get('/analytics/owner', 
  authMiddleware, 
  roleMiddleware(['owner']), 
  EnhancedControllers.analyticsController.getOwnerAnalytics
);

// User Management Routes (Admin)
router.get('/admin/users', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.userManagementController.getAllUsers
);

router.put('/admin/users/:userId/status', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.userManagementController.updateUserStatus
);

router.get('/admin/users/stats', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.userManagementController.getUserStats
);

router.put('/admin/owners/:ownerId/verify', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.userManagementController.verifyOwner
);

router.get('/admin/verification-requests', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  EnhancedControllers.userManagementController.getVerificationRequests
);

module.exports = router;