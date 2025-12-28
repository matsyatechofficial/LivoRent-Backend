// backend/controllers/bookingController.js
const { Booking } = require('../models/bookingModel');
const Property = require('../models/propertyModel');

const bookingController = {
  // Create booking
  create: async (req, res) => {
    try {
      const { property_id, start_date, end_date, tenant_message } = req.body;
      const tenantId = req.user.id;

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

      // Calculate total price
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const totalPrice = property.price * days;

      // Determine status based on instant booking
      const status = property.instant_booking ? 'confirmed' : 'pending';

      const bookingData = {
        property_id,
        tenant_id: tenantId,
        owner_id: property.owner_id,
        start_date,
        end_date,
        total_price: totalPrice,
        tenant_message,
        status
      };

      const bookingId = await Booking.create(bookingData);
      const booking = await Booking.findById(bookingId);

      res.status(201).json({
        message: status === 'confirmed' 
          ? 'Booking confirmed successfully' 
          : 'Booking request sent successfully',
        booking
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Get tenant bookings
  getTenantBookings: async (req, res) => {
    try {
      const bookings = await Booking.getTenantBookings(req.user.id);
      res.json({ bookings });
    } catch (error) {
      console.error('Get tenant bookings error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get owner bookings
  getOwnerBookings: async (req, res) => {
    try {
      const bookings = await Booking.getOwnerBookings(req.user.id);
      res.json({ bookings });
    } catch (error) {
      console.error('Get owner bookings error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get booking details
  getById: async (req, res) => {
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

      res.json({ booking });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Update booking status (owner)
  updateStatus: async (req, res) => {
    try {
      const { status, owner_response } = req.body;
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user is owner
      if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Validate status
      if (!['confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await Booking.updateStatus(req.params.id, status, owner_response);
      const updatedBooking = await Booking.findById(req.params.id);

      res.json({
        message: `Booking ${status} successfully`,
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Cancel booking (tenant)
  cancel: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user is tenant
      if (booking.tenant_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Check if booking can be cancelled
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: 'Booking cannot be cancelled' });
      }

      await Booking.cancel(req.params.id);

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Get property bookings (for calendar)
  getPropertyBookings: async (req, res) => {
    try {
      const property = await Property.findById(req.params.propertyId);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Check if user is owner or admin
      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const bookings = await Booking.getPropertyBookings(req.params.propertyId);

      res.json({ bookings });
    } catch (error) {
      console.error('Get property bookings error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Check availability
  checkAvailability: async (req, res) => {
    try {
      const { property_id, start_date, end_date } = req.query;

      if (!property_id || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }

      const isAvailable = await Booking.checkAvailability(property_id, start_date, end_date);

      res.json({ available: isAvailable });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get all bookings (admin)
  getAll: async (req, res) => {
    try {
      const filters = {
        status: req.query.status
      };

      const bookings = await Booking.getAll(filters);
      res.json({ bookings });
    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

// backend/controllers/wishlistController.js
const { Wishlist } = require('../models/bookingModel');

const wishlistController = {
  // Add to wishlist
  add: async (req, res) => {
    try {
      const { property_id } = req.body;
      const userId = req.user.id;

      // Check if property exists
      const property = await Property.findById(property_id);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      await Wishlist.add(userId, property_id);

      res.status(201).json({ 
        message: 'Property added to wishlist',
        property_id
      });
    } catch (error) {
      if (error.message === 'Property already in wishlist') {
        return res.status(400).json({ message: error.message });
      }
      console.error('Add to wishlist error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Remove from wishlist
  remove: async (req, res) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user.id;

      const removed = await Wishlist.remove(userId, propertyId);

      if (!removed) {
        return res.status(404).json({ message: 'Property not in wishlist' });
      }

      res.json({ message: 'Property removed from wishlist' });
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get user wishlist
  getUserWishlist: async (req, res) => {
    try {
      const properties = await Wishlist.getUserWishlist(req.user.id);

      // Get images for each property
      for (let property of properties) {
        const images = await Property.getImages(property.id);
        property.images = images;
        property.inWishlist = true; // Already in wishlist
      }

      res.json({ properties });
    } catch (error) {
      console.error('Get wishlist error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Toggle wishlist
  toggle: async (req, res) => {
    try {
      const { property_id } = req.body;
      const userId = req.user.id;

      // Check if property exists
      const property = await Property.findById(property_id);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Check if already in wishlist
      const isInWishlist = await Wishlist.isInWishlist(userId, property_id);

      if (isInWishlist) {
        await Wishlist.remove(userId, property_id);
        res.json({ 
          message: 'Property removed from wishlist',
          inWishlist: false
        });
      } else {
        await Wishlist.add(userId, property_id);
        res.json({ 
          message: 'Property added to wishlist',
          inWishlist: true
        });
      }
    } catch (error) {
      console.error('Toggle wishlist error:', error);
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = { bookingController, wishlistController };