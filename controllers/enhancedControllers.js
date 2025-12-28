const EnhancedServices = require('../services/enhancedServices');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
}).array('images', 10); // Max 10 images

const EnhancedControllers = {
  // Property Controllers
  propertyController: {
    // Create property
    createProperty: async (req, res) => {
      try {
        upload(req, res, async (err) => {
          if (err) {
            return res.status(400).json({ message: err.message });
          }
          
          const propertyData = {
            ...req.body,
            owner_id: req.user.id,
            amenities: req.body.amenities ? JSON.parse(req.body.amenities) : []
          };
          
          const result = await EnhancedServices.propertyService.createProperty(
            propertyData,
            req.files
          );
          
          res.status(201).json({
            message: 'Property created successfully',
            propertyId: result.propertyId,
            images: result.imageUrls
          });
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get property details
    getPropertyDetails: async (req, res) => {
      try {
        const propertyId = req.params.id;
        const property = await EnhancedServices.propertyService.getPropertyDetails(propertyId);
        
        // Check if property is in user's wishlist
        let inWishlist = false;
        if (req.user) {
          inWishlist = await EnhancedServices.wishlistService.isInWishlist(
            req.user.id,
            propertyId
          );
        }
        
        res.json({
          ...property,
          inWishlist
        });
      } catch (error) {
        res.status(404).json({ message: error.message });
      }
    },

    // Search properties
    searchProperties: async (req, res) => {
      try {
        const filters = {
          city: req.query.city,
          property_type: req.query.property_type,
          min_price: req.query.min_price,
          max_price: req.query.max_price,
          bedrooms: req.query.bedrooms,
          furnishing: req.query.furnishing,
          amenities: req.query.amenities ? req.query.amenities.split(',') : [],
          sort_by: req.query.sort_by || 'newest',
          limit: req.query.limit || 20,
          offset: req.query.offset || 0
        };
        
        const properties = await EnhancedServices.propertyService.searchProperties(filters);
        res.json({ properties });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get nearby properties
    getNearbyProperties: async (req, res) => {
      try {
        const { lat, lng, radius = 5 } = req.query;
        const properties = await EnhancedServices.propertyService.getNearbyProperties(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(radius)
        );
        res.json({ properties });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get properties by owner
    getOwnerProperties: async (req, res) => {
      try {
        const properties = await EnhancedServices.propertyService.getPropertiesByOwner(
          req.user.id
        );
        res.json({ properties });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Update property
    updateProperty: async (req, res) => {
      try {
        const propertyId = req.params.id;
        const updateData = {
          ...req.body,
          amenities: req.body.amenities ? JSON.parse(req.body.amenities) : []
        };
        
        upload(req, res, async (err) => {
          if (err) {
            return res.status(400).json({ message: err.message });
          }
          
          const updated = await EnhancedServices.propertyService.updateProperty(
            propertyId,
            updateData,
            req.files
          );
          
          if (updated) {
            res.json({ message: 'Property updated successfully' });
          } else {
            res.status(404).json({ message: 'Property not found' });
          }
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Delete property
    deleteProperty: async (req, res) => {
      try {
        const propertyId = req.params.id;
        
        // Verify ownership
        const property = await EnhancedServices.propertyService.getPropertyDetails(propertyId);
        if (!property || property.owner_id !== req.user.id) {
          return res.status(403).json({ message: 'Permission denied' });
        }
        
        const deleted = await EnhancedServices.propertyService.deleteProperty(propertyId);
        
        if (deleted) {
          res.json({ message: 'Property deleted successfully' });
        } else {
          res.status(404).json({ message: 'Property not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Booking Controllers
  bookingController: {
    // Create booking
    createBooking: async (req, res) => {
      try {
        const bookingData = {
          ...req.body,
          tenant_id: req.user.id
        };
        
        const bookingId = await EnhancedServices.bookingService.createBooking(bookingData);
        res.status(201).json({
          message: 'Booking created successfully',
          bookingId
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get user bookings
    getUserBookings: async (req, res) => {
      try {
        const bookings = await EnhancedServices.bookingService.getUserBookings(
          req.user.id,
          req.user.role
        );
        res.json({ bookings });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Update booking status
    updateBookingStatus: async (req, res) => {
      try {
        const { bookingId } = req.params;
        const { status } = req.body;
        
        const updated = await EnhancedServices.bookingService.updateBookingStatus(
          bookingId,
          status,
          req.user.role
        );
        
        if (updated) {
          res.json({ message: 'Booking status updated successfully' });
        } else {
          res.status(404).json({ message: 'Booking not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Check availability
    checkAvailability: async (req, res) => {
      try {
        const { propertyId, checkInDate, checkOutDate } = req.body;
        
        const isAvailable = await EnhancedServices.bookingService.checkAvailability(
          propertyId,
          checkInDate,
          checkOutDate
        );
        
        res.json({ available: isAvailable });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Wishlist Controllers
  wishlistController: {
    // Add to wishlist
    addToWishlist: async (req, res) => {
      try {
        const { propertyId } = req.body;
        
        await EnhancedServices.wishlistService.addToWishlist(
          req.user.id,
          propertyId
        );
        
        res.json({ message: 'Added to wishlist' });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Remove from wishlist
    removeFromWishlist: async (req, res) => {
      try {
        const { propertyId } = req.params;
        
        const removed = await EnhancedServices.wishlistService.removeFromWishlist(
          req.user.id,
          propertyId
        );
        
        if (removed) {
          res.json({ message: 'Removed from wishlist' });
        } else {
          res.status(404).json({ message: 'Property not in wishlist' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get user wishlist
    getUserWishlist: async (req, res) => {
      try {
        const wishlist = await EnhancedServices.wishlistService.getUserWishlist(req.user.id);
        res.json({ wishlist });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Check if property is in wishlist
    checkWishlist: async (req, res) => {
      try {
        const { propertyId } = req.params;
        
        const inWishlist = await EnhancedServices.wishlistService.isInWishlist(
          req.user.id,
          propertyId
        );
        
        res.json({ inWishlist });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Inquiry Controllers
  inquiryController: {
    // Create inquiry
    createInquiry: async (req, res) => {
      try {
        const inquiryData = {
          ...req.body,
          user_id: req.user.id
        };
        
        const inquiryId = await EnhancedServices.inquiryService.createInquiry(inquiryData);
        res.status(201).json({
          message: 'Inquiry sent successfully',
          inquiryId
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get owner inquiries
    getOwnerInquiries: async (req, res) => {
      try {
        const inquiries = await EnhancedServices.inquiryService.getOwnerInquiries(req.user.id);
        res.json({ inquiries });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Update inquiry status
    updateInquiryStatus: async (req, res) => {
      try {
        const { inquiryId } = req.params;
        const { status } = req.body;
        
        const updated = await EnhancedServices.inquiryService.updateInquiryStatus(
          inquiryId,
          status
        );
        
        if (updated) {
          res.json({ message: 'Inquiry status updated' });
        } else {
          res.status(404).json({ message: 'Inquiry not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Review Controllers
  reviewController: {
    // Create review
    createReview: async (req, res) => {
      try {
        const reviewData = {
          ...req.body,
          user_id: req.user.id
        };
        
        const reviewId = await EnhancedServices.reviewService.createReview(reviewData);
        res.status(201).json({
          message: 'Review submitted successfully',
          reviewId
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get property reviews
    getPropertyReviews: async (req, res) => {
      try {
        const { propertyId } = req.params;
        const reviews = await EnhancedServices.reviewService.getPropertyReviews(propertyId);
        res.json({ reviews });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // User Management Controllers (Admin)
  userManagementController: {
    // Get all users
    getAllUsers: async (req, res) => {
      try {
        const { role } = req.query;
        const users = await EnhancedServices.userManagementService.getAllUsers(role);
        res.json({ users });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Update user status
    updateUserStatus: async (req, res) => {
      try {
        const { userId } = req.params;
        const { isActive } = req.body;
        
        const updated = await EnhancedServices.userManagementService.updateUserStatus(
          userId,
          isActive
        );
        
        if (updated) {
          res.json({ message: 'User status updated' });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get user statistics
    getUserStats: async (req, res) => {
      try {
        const stats = await EnhancedServices.userManagementService.getUserStats();
        res.json({ stats });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Verify owner
    verifyOwner: async (req, res) => {
      try {
        const { ownerId } = req.params;
        
        const verified = await EnhancedServices.userManagementService.verifyOwner(ownerId);
        
        if (verified) {
          res.json({ message: 'Owner verified successfully' });
        } else {
          res.status(404).json({ message: 'Owner not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get verification requests
    getVerificationRequests: async (req, res) => {
      try {
        const requests = await EnhancedServices.userManagementService.getVerificationRequests();
        res.json({ requests });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Maps Controllers
  mapsController: {
    // Get nearby places
    getNearbyPlaces: async (req, res) => {
      try {
        const { lat, lng, types } = req.query;
        const placeTypes = types ? types.split(',') : ['school', 'hospital', 'transit_station'];
        
        const places = await EnhancedServices.mapsService.getNearbyPlaces(
          parseFloat(lat),
          parseFloat(lng),
          placeTypes
        );
        
        res.json({ places });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Geocode address
    geocodeAddress: async (req, res) => {
      try {
        const { address } = req.query;
        const location = await EnhancedServices.mapsService.geocodeAddress(address);
        
        if (location) {
          res.json({ location });
        } else {
          res.status(404).json({ message: 'Address not found' });
        }
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  },

  // Analytics Controllers
  analyticsController: {
    // Get platform analytics (admin)
    getPlatformAnalytics: async (req, res) => {
      try {
        const analytics = await EnhancedServices.analyticsService.getPlatformAnalytics();
        res.json({ analytics });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    // Get owner analytics
    getOwnerAnalytics: async (req, res) => {
      try {
        const analytics = await EnhancedServices.analyticsService.getOwnerAnalytics(req.user.id);
        res.json({ analytics });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  }
};

module.exports = EnhancedControllers;