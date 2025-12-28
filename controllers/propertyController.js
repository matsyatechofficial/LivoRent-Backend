// ========================================
// controllers/propertyController.js (NEW)
// ========================================
const { Property } = require('../models/propertyModel');
const cloudinaryService = require('../services/cloudnaryService');

const propertyController = {

  getAll: async (req, res) => {
    try {
      const filters = {
        city: req.query.city,
        property_type: req.query.property_type,
        min_price: req.query.min_price,
        max_price: req.query.max_price,
        bedrooms: req.query.bedrooms,
        bathrooms: req.query.bathrooms,
        furnishing: req.query.furnishing,
        instant_booking: req.query.instant_booking === 'true',
        is_available: req.query.is_available !== 'false',
        is_verified: req.query.is_verified === 'true',
        sort_by: req.query.sort_by,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };
      // Allow admin to request drafts by passing ?admin=true (only works for admin role)
      if (req.user && req.user.role === 'admin' && req.query.admin === 'true') {
        filters.adminView = true;
      }

      // ✅ Use findAllWithCount to get both data and total count correctly
      const { properties, total } = await Property.findAllWithCount(filters);

      if (req.user) {
        const { Wishlist } = require('../models/propertyModel');
        for (let prop of properties) {
          prop.inWishlist = await Wishlist.isInWishlist(req.user.id, prop.id);
        }
      }

      res.json({ properties, total });
    } catch (error) {
      console.error("Internal Server Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  },


  // Get single property
  getById: async (req, res) => {
    try {
      const property = await Property.findById(req.params.id, req.user?.id);
      
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Increment view count
      await Property.incrementViewCount(req.params.id);

      res.json({ property });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

 // Create property (Owner only)
create: async (req, res) => {
  try {
    const propertyData = {
      owner_id: req.user.id,
      ...req.body,
      // amenities & nearby_places conversion
      amenities: req.body.amenities
        ? req.body.amenities.split(',').map(a => a.trim())
        : [],
      nearby_places: req.body.nearby_places
        ? req.body.nearby_places.split(',').map(p => p.trim())
        : []
    };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (const file of req.files) {
        const result = await cloudinaryService.uploadImage(file.path, 'properties');
        uploadedImages.push(result.secure_url);
      }
      propertyData.images = uploadedImages;
      propertyData.primary_image = uploadedImages[0];
    }

    const propertyId = await Property.create(propertyData);
    const property = await Property.findById(propertyId);

    res.status(201).json({
      message: 'Property created successfully',
      property
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
,

  // Update property (Owner only)
update: async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);

    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData = {
      ...req.body,
      amenities: req.body.amenities
        ? req.body.amenities.split(',').map(a => a.trim())
        : property.amenities,
      nearby_places: req.body.nearby_places
        ? req.body.nearby_places.split(',').map(p => p.trim())
        : property.nearby_places
    };

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (const file of req.files) {
        const result = await cloudinaryService.uploadImage(file.path, 'properties');
        uploadedImages.push(result.secure_url);
      }
      updateData.images = [...(property.images || []), ...uploadedImages];
      if (!updateData.primary_image) updateData.primary_image = updateData.images[0];
    }

    await Property.update(propertyId, updateData);
    const updatedProperty = await Property.findById(propertyId);

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
,

  // Delete property (Owner only)
  delete: async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Check ownership
      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Property.delete(req.params.id);

      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get owner's properties
  getOwnerProperties: async (req, res) => {
    try {
      const properties = await Property.findByOwner(req.user.id);
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get featured properties
  getFeatured: async (req, res) => {
    try {
      const properties = await Property.getFeatured(6);
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Search nearby properties
  searchNearby: async (req, res) => {
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude required' });
      }

      const properties = await Property.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius) || 10
      );

      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Verify property (Admin only)
  verifyProperty: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      await Property.update(id, { is_verified });

      res.json({
        message: `Property ${is_verified ? 'verified' : 'unverified'} successfully`
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Publish property (Admin/Owner)
  publish: async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Property.update(req.params.id, { status: 1 });

      res.json({ message: 'Property published successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update property status
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (![0, 1].includes(Number(status))) {
        return res.status(400).json({ message: 'Invalid status. Use 0 (Draft) or 1 (Active)' });
      }

      await Property.update(req.params.id, { status: Number(status) });

      res.json({
        message: `Property status updated to ${status === 1 ? 'Active' : 'Draft'}`,
        status: Number(status)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get deleted properties (Admin only)
  getDeleted: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can view deleted properties' });
      }

      const filters = {
        city: req.query.city,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };

      const { properties, total } = await Property.findDeleted(filters);
      res.json({ properties, total });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Restore deleted property (Admin only)
  restore: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can restore properties' });
      }

      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (!property.deleted_at) {
        return res.status(400).json({ message: 'Property is not deleted' });
      }

      await Property.restore(req.params.id);

      res.json({ message: 'Property restored successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Delete permanently (hard delete - admin only)
  deletePermanently: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can permanently delete properties' });
      }

      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      await Property.hardDelete(req.params.id);

      res.json({ message: 'Property permanently deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

// ========================================
// controllers/bookingController.js (NEW)
// ========================================
const { Booking } = require('../models/propertyModel');

const bookingController = {
  // Create booking
  create: async (req, res) => {
    try {
      const { property_id, start_date, end_date, message } = req.body;

      // Get property details
      const property = await Property.findById(property_id);
      
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (!property.is_available) {
        return res.status(400).json({ message: 'Property is not available' });
      }

      // Check availability
      const isAvailable = await Booking.checkAvailability(property_id, start_date, end_date);
      
      if (!isAvailable) {
        return res.status(400).json({ message: 'Property is not available for selected dates' });
      }

      // Calculate total amount (simplified)
      const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
      const total_amount = property.price * (days / 30); // Monthly rent calculation

      const bookingData = {
        property_id,
        tenant_id: req.user.id,
        owner_id: property.owner_id,
        start_date,
        end_date,
        message,
        total_amount,
        status: property.instant_booking ? 'accepted' : 'pending'
      };

      const bookingId = await Booking.create(bookingData);
      const booking = await Booking.findById(bookingId);

      res.status(201).json({
        message: 'Booking created successfully',
        booking
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Get all bookings (filtered by role)
  getAll: async (req, res) => {
    try {
      const filters = {};

      if (req.user.role === 'tenant') {
        filters.tenant_id = req.user.id;
      } else if (req.user.role === 'owner') {
        filters.owner_id = req.user.id;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.property_id) {
        filters.property_id = req.query.property_id;
      }

      const bookings = await Booking.findAll(filters);

      res.json({ bookings });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
getById: async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check authorization
    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (req.user.role === 'owner' && booking.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Hide owner contact details if payment not verified
    if (req.user.role === 'tenant' && booking.payment_status !== 'paid') {
      delete booking.owner_email;
      delete booking.owner_phone;
    }
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Failed to get booking' });
  }
},
  

  // Update booking status (Owner only)
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check authorization
      if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Booking.updateStatus(req.params.id, status);
      const updatedBooking = await Booking.findById(req.params.id);

      res.json({
        message: 'Booking status updated',
        booking: updatedBooking
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Cancel booking
  cancel: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check authorization
      if (
        booking.tenant_id !== req.user.id &&
        booking.owner_id !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Booking.updateStatus(req.params.id, 'cancelled');

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get booked dates for property
  getBookedDates: async (req, res) => {
    try {
      const { propertyId } = req.params;
      const bookedDates = await Booking.getBookedDates(propertyId);
      res.json({ bookedDates });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

// ========================================
// controllers/wishlistController.js (NEW)
// ========================================
const { Wishlist } = require('../models/propertyModel');

const wishlistController = {
  // Get user wishlist
  getWishlist: async (req, res) => {
    try {
      const properties = await Wishlist.getUserWishlist(req.user.id);
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Add to wishlist
  add: async (req, res) => {
    try {
      const { propertyId } = req.body;
      
      await Wishlist.add(req.user.id, propertyId);
      
      res.status(201).json({ message: 'Added to wishlist' });
    } catch (error) {
      if (error.message === 'Property already in wishlist') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },

  // Remove from wishlist
  remove: async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      const removed = await Wishlist.remove(req.user.id, propertyId);
      
      if (!removed) {
        return res.status(404).json({ message: 'Property not in wishlist' });
      }

      res.json({ message: 'Removed from wishlist' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

// ========================================
// controllers/userController.js (NEW)
// ========================================
const User = require('../models/userModel');

const userController = {
  // Get all users (Admin only)
  getAll: async (req, res) => {
    try {
      const [users] = await require('../config/db').query(
        'SELECT id, name, email, role, is_active, is_verified, created_at FROM users ORDER BY created_at DESC'
      );
      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get user by ID
  getById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, profile_image } = req.body;

      // Check authorization
      if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const db = require('../config/db');
      await db.query(
        'UPDATE users SET name = ?, phone = ?, profile_image = ? WHERE id = ?',
        [name, phone, profile_image, id]
      );

      const user = await User.findById(id);
      res.json({ message: 'Profile updated', user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Verify user (Admin only)
  verifyUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      const db = require('../config/db');
      await db.query('UPDATE users SET is_verified = ? WHERE id = ?', [is_verified, id]);

      res.json({ message: `User ${is_verified ? 'verified' : 'unverified'} successfully` });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Toggle user status (Admin only)
  toggleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const db = require('../config/db');
      await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, id]);

      res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = {
  propertyController,
  bookingController,
  wishlistController,
  userController
};