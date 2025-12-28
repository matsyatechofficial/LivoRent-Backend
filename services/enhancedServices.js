const { Property, PropertyImage, Booking, Wishlist, Inquiry, Review, UserManagement } = require('../models/enhancedModels');

// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const EnhancedServices = {
  // Property Services
  propertyService: {
    // Create property with image upload
    createProperty: async (propertyData, files) => {
      const propertyId = await Property.create(propertyData);
      
      // Upload images to Cloudinary
      const imageUrls = [];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const result = await cloudinary.uploader.upload(files[i].path, {
            folder: 'properties',
            transformation: [
              { width: 800, height: 600, crop: 'fill' },
              { quality: 'auto' }
            ]
          });
          
          const isPrimary = i === 0;
          await PropertyImage.add(propertyId, result.secure_url, isPrimary);
          imageUrls.push(result.secure_url);
        }
      }
      
      return { propertyId, imageUrls };
    },

    // Get property details
    getPropertyDetails: async (propertyId) => {
      const property = await Property.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }
      
      // Increment view count
      await Property.incrementViewCount(propertyId);
      
      // Get images
      const images = await PropertyImage.getByProperty(propertyId);
      
      // Get reviews
      const reviews = await Review.getByProperty(propertyId);
      const ratingStats = await Review.getPropertyRating(propertyId);
      
      return {
        ...property,
        images,
        reviews,
        ratingStats
      };
    },

    // Search properties
    searchProperties: async (filters) => {
      return await Property.search(filters);
    },

    // Get nearby properties
    getNearbyProperties: async (lat, lng, radius) => {
      return await Property.findNearby(lat, lng, radius);
    },

    // Update property
    updateProperty: async (propertyId, updateData, files) => {
      const updated = await Property.update(propertyId, updateData);
      
      // Upload new images if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'properties'
          });
          await PropertyImage.add(propertyId, result.secure_url);
        }
      }
      
      return updated;
    }
  },

  // Booking Services
  bookingService: {
    // Create booking
    createBooking: async (bookingData) => {
      // Check availability
      const isAvailable = await Booking.checkAvailability(
        bookingData.property_id,
        bookingData.check_in_date,
        bookingData.check_out_date
      );
      
      if (!isAvailable) {
        throw new Error('Property not available for selected dates');
      }
      
      return await Booking.create(bookingData);
    },

    // Get bookings for user
    getUserBookings: async (userId, role) => {
      if (role === 'tenant') {
        return await Booking.findByTenant(userId);
      } else if (role === 'owner') {
        return await Booking.findByOwner(userId);
      }
      return [];
    },

    // Update booking status
    updateBookingStatus: async (bookingId, status, role) => {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // Only owner can confirm/cancel bookings for their property
      if (role === 'owner') {
        return await Booking.updateStatus(bookingId, status);
      }
      
      // Tenants can only cancel their own bookings
      if (role === 'tenant' && status === 'cancelled') {
        return await Booking.updateStatus(bookingId, status);
      }
      
      throw new Error('Permission denied');
    }
  },

  // Wishlist Services
  wishlistService: {
    // Add to wishlist
    addToWishlist: async (userId, propertyId) => {
      const result = await Wishlist.add(userId, propertyId);
      if (result === 'already_exists') {
        throw new Error('Property already in wishlist');
      }
      return result;
    },

    // Remove from wishlist
    removeFromWishlist: async (userId, propertyId) => {
      return await Wishlist.remove(userId, propertyId);
    },

    // Get user wishlist
    getUserWishlist: async (userId) => {
      return await Wishlist.getUserWishlist(userId);
    }
  },

  // Inquiry Services
  inquiryService: {
    // Create inquiry
    createInquiry: async (inquiryData) => {
      return await Inquiry.create(inquiryData);
    },

    // Get inquiries for property owner
    getOwnerInquiries: async (ownerId) => {
      return await Inquiry.getByPropertyOwner(ownerId);
    },

    // Update inquiry status
    updateInquiryStatus: async (inquiryId, status) => {
      return await Inquiry.updateStatus(inquiryId, status);
    }
  },

  // Review Services
  reviewService: {
    // Create review
    createReview: async (reviewData) => {
      // Check if user has completed booking for this property
      const [bookings] = await require('../config/db').query(
        `SELECT id FROM bookings 
        WHERE property_id = ? AND tenant_id = ? 
        AND status = 'completed'`,
        [reviewData.property_id, reviewData.user_id]
      );
      
      if (bookings.length === 0) {
        throw new Error('You can only review properties you have stayed at');
      }
      
      return await Review.create(reviewData);
    },

    // Get property reviews
    getPropertyReviews: async (propertyId) => {
      return await Review.getByProperty(propertyId);
    }
  },

  // User Management Services (Admin)
  userManagementService: {
    // Get all users
    getAllUsers: async (role) => {
      return await UserManagement.getAllUsers(role);
    },

    // Update user status
    updateUserStatus: async (userId, isActive) => {
      return await UserManagement.updateUserStatus(userId, isActive);
    },

    // Get user statistics
    getUserStats: async () => {
      return await UserManagement.getUserStats();
    },

    // Verify owner
    verifyOwner: async (ownerId) => {
      return await UserManagement.verifyOwner(ownerId);
    },

    // Get verification requests
    getVerificationRequests: async () => {
      return await UserManagement.getVerificationRequests();
    }
  },

  // Google Maps Services
  mapsService: {
    // Get nearby places using Google Places API
    getNearbyPlaces: async (lat, lng, types = ['school', 'hospital', 'transit_station']) => {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const radius = 2000; // 2km radius
      
      const places = [];
      
      for (const type of types) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`
        );
        
        const data = await response.json();
        if (data.results) {
          places.push(...data.results.map(place => ({
            name: place.name,
            type: type,
            address: place.vicinity,
            rating: place.rating,
            location: place.geometry.location
          })));
        }
      }
      
      return places.slice(0, 10); // Return top 10 places
    },

    // Get geocode from address
    geocodeAddress: async (address) => {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].geometry.location;
      }
      return null;
    }
  },

  // Analytics Services
  analyticsService: {
    // Get platform analytics
    getPlatformAnalytics: async () => {
      const db = require('../config/db');
      
      const [propertyStats] = await db.query(`
        SELECT 
          COUNT(*) as total_properties,
          SUM(CASE WHEN is_available = true THEN 1 ELSE 0 END) as available_properties,
          AVG(price) as avg_price,
          SUM(view_count) as total_views
        FROM properties
      `);
      
      const [bookingStats] = await db.query(`
        SELECT 
          COUNT(*) as total_bookings,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(total_amount) as total_revenue
        FROM bookings
        WHERE payment_status = 'paid'
      `);
      
      const [userStats] = await db.query(`
        SELECT 
          role,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM users
        WHERE role != 'admin'
        GROUP BY role, DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      
      return {
        propertyStats: propertyStats[0],
        bookingStats: bookingStats[0],
        userStats
      };
    },

    // Get owner analytics
    getOwnerAnalytics: async (ownerId) => {
      const db = require('../config/db');
      
      const [propertyStats] = await db.query(`
        SELECT 
          COUNT(*) as total_properties,
          SUM(CASE WHEN is_available = true THEN 1 ELSE 0 END) as available_properties,
          AVG(price) as avg_price,
          SUM(view_count) as total_views
        FROM properties
        WHERE owner_id = ?
      `, [ownerId]);
      
      const [bookingStats] = await db.query(`
        SELECT 
          COUNT(*) as total_bookings,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(total_amount) as total_revenue
        FROM bookings
        WHERE owner_id = ? AND payment_status = 'paid'
      `, [ownerId]);
      
      const [revenueByMonth] = await db.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          SUM(total_amount) as revenue,
          COUNT(*) as bookings
        FROM bookings
        WHERE owner_id = ? AND payment_status = 'paid'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 6
      `, [ownerId]);
      
      return {
        propertyStats: propertyStats[0],
        bookingStats: bookingStats[0],
        revenueByMonth
      };
    }
  }
};

module.exports = EnhancedServices;