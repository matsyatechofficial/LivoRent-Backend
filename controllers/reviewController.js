
// ========================================
// backend/controllers/reviewController.js (NEW)
// ========================================
const Review = require('../models/reviewModel.js');

const reviewController = {
  create: async (req, res) => {
    try {
      const { property_id, booking_id, rating, comment, cleanliness, communication, value_for_money } = req.body;

      // Check if user can review
      const canReview = await Review.canReview(req.user.id, property_id);
      if (!canReview) {
        return res.status(403).json({ 
          message: 'You can only review properties you have booked' 
        });
      }

      const reviewId = await Review.create({
        property_id,
        user_id: req.user.id,
        booking_id,
        rating,
        comment,
        cleanliness,
        communication,
        value_for_money
      });

      res.status(201).json({
        message: 'Review submitted successfully',
        reviewId
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getByProperty: async (req, res) => {
    try {
      const reviews = await Review.findByProperty(req.params.propertyId);
      const averages = await Review.getAverageRatings(req.params.propertyId);
      
      res.json({ reviews, averages });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getMyReviews: async (req, res) => {
    try {
      const reviews = await Review.findByUser(req.user.id);
      res.json({ reviews });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { rating, comment, cleanliness, communication, value_for_money } = req.body;
      
      await Review.update(req.params.id, {
        rating,
        comment,
        cleanliness,
        communication,
        value_for_money
      });

      res.json({ message: 'Review updated successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await Review.delete(req.params.id);
      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = reviewController;