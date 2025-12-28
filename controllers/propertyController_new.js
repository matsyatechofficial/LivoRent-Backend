const Property = require('../models/propertyModel');
const cloudinaryService = require('../services/cloudnaryService');

const propertyController = {
  // Get all active properties (public view)
  getAll: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const properties = await Property.getAllActive(limit, offset);
      const total = await Property.getCount(1, false);

      res.json({
        success: true,
        count: properties.length,
        total,
        properties,
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch properties',
      });
    }
  },

  // Get property by type
  getByType: async (req, res) => {
    try {
      const { type } = req.params; // 'rent' or 'sale'

      if (!['rent', 'sale'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property type. Use "rent" or "sale"',
        });
      }

      const properties = await Property.getByType(type);

      res.json({
        success: true,
        count: properties.length,
        properties,
      });
    } catch (error) {
      console.error('Error fetching properties by type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch properties',
      });
    }
  },

  // Get single property
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const property = await Property.getById(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      res.json({
        success: true,
        property,
      });
    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property',
      });
    }
  },

  // Create property (Owner/Admin)
  create: async (req, res) => {
    try {
      const {
        title,
        description,
        property_type,
        price,
        area,
        rooms,
        bathrooms,
        contact_phone,
        location_name,
        latitude,
        longitude,
        status = 0,
      } = req.body;

      // Validate required fields
      if (!title || !property_type || !price || !area || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, property_type, price, area, latitude, longitude',
        });
      }

      // Handle image uploads
      let images = [];
      let featured_image = null;

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const imageUrl = await cloudinaryService.uploadImage(file);
            images.push(imageUrl);
            if (!featured_image) {
              featured_image = imageUrl;
            }
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
          }
        }
      }

      const propertyData = {
        owner_id: req.user.id,
        title,
        description,
        property_type,
        price: parseFloat(price),
        area: parseFloat(area),
        rooms: parseInt(rooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        contact_phone,
        location_name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        images,
        featured_image,
        status: parseInt(status),
      };

      const propertyId = await Property.create(propertyData);

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        propertyId,
        property: {
          id: propertyId,
          ...propertyData,
        },
      });
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create property',
      });
    }
  },

  // Update property
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verify ownership
      const property = await Property.getById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to update this property',
        });
      }

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        let images = updateData.images || property.images || [];
        for (const file of req.files) {
          try {
            const imageUrl = await cloudinaryService.uploadImage(file);
            images.push(imageUrl);
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
          }
        }
        updateData.images = images;
      }

      // Convert numeric fields
      if (updateData.latitude) updateData.latitude = parseFloat(updateData.latitude);
      if (updateData.longitude) updateData.longitude = parseFloat(updateData.longitude);
      if (updateData.price) updateData.price = parseFloat(updateData.price);
      if (updateData.area) updateData.area = parseFloat(updateData.area);
      if (updateData.rooms) updateData.rooms = parseInt(updateData.rooms);
      if (updateData.bathrooms) updateData.bathrooms = parseInt(updateData.bathrooms);

      const success = await Property.update(id, req.user.id, updateData);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update property',
        });
      }

      const updatedProperty = await Property.getById(id);

      res.json({
        success: true,
        message: 'Property updated successfully',
        property: updatedProperty,
      });
    } catch (error) {
      console.error('Error updating property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update property',
      });
    }
  },

  // Delete property (Soft delete)
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const property = await Property.getById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to delete this property',
        });
      }

      const success = await Property.delete(id, req.user.id, req.user.id);

      res.json({
        success,
        message: success ? 'Property deleted successfully' : 'Failed to delete property',
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete property',
      });
    }
  },

  // Restore soft deleted property
  restore: async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can restore properties',
        });
      }

      const success = await Property.restore(id);

      res.json({
        success,
        message: success ? 'Property restored successfully' : 'Failed to restore property',
      });
    } catch (error) {
      console.error('Error restoring property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore property',
      });
    }
  },

  // Get owner's properties
  getOwnerProperties: async (req, res) => {
    try {
      const properties = await Property.getByOwnerId(req.user.id);

      res.json({
        success: true,
        count: properties.length,
        properties,
      });
    } catch (error) {
      console.error('Error fetching owner properties:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch properties',
      });
    }
  },

  // Get deleted properties (Admin only)
  getDeleted: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can view deleted properties',
        });
      }

      const properties = await Property.getDeleted();

      res.json({
        success: true,
        count: properties.length,
        properties,
      });
    } catch (error) {
      console.error('Error fetching deleted properties:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deleted properties',
      });
    }
  },

  // Get dashboard statistics (Admin & Owner)
  getStats: async (req, res) => {
    try {
      if (req.user.role === 'admin') {
        // Admin sees global stats
        const stats = await Property.getStats();
        res.json({
          success: true,
          stats,
        });
      } else if (req.user.role === 'owner') {
        // Owner sees their stats
        const stats = await Property.getOwnerStats(req.user.id);
        res.json({
          success: true,
          stats,
        });
      } else {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  },

  // Toggle property status (publish/unpublish)
  toggleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const property = await Property.getById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (![0, 1].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use 0 (draft) or 1 (published)',
        });
      }

      const success = await Property.update(id, req.user.id, { status });

      res.json({
        success,
        message: success ? 'Property status updated' : 'Failed to update status',
      });
    } catch (error) {
      console.error('Error toggling property status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle property status',
      });
    }
  },
};

module.exports = propertyController;
