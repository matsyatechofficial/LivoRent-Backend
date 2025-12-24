// ========================================
// services/cloudinaryService.js (NEW)
// ========================================
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

const cloudinaryService = {
  uploadImage: async (filePath, folder = 'properties') => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `rental/${folder}`,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      });

      // Delete local file after upload
      fs.unlinkSync(filePath);

      return result;
    } catch (error) {
      // Delete local file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  },

  uploadVideo: async (filePath, folder = 'properties') => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `rental/${folder}`,
        resource_type: 'video',
        transformation: [
          { quality: 'auto' }
        ]
      });

      fs.unlinkSync(filePath);
      return result;
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  },

  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = cloudinaryService;
