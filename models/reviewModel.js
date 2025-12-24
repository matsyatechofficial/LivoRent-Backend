
// ========================================
// backend/models/reviewModel.js (COMPLETE)
// ========================================
const db = require('../config/db');

const Review = {
  create: async (reviewData) => {
    const [result] = await db.query(
      `INSERT INTO reviews (property_id, user_id, booking_id, rating, comment, cleanliness, communication, value_for_money)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewData.property_id,
        reviewData.user_id,
        reviewData.booking_id,
        reviewData.rating,
        reviewData.comment,
        reviewData.cleanliness || reviewData.rating,
        reviewData.communication || reviewData.rating,
        reviewData.value_for_money || reviewData.rating
      ]
    );

    // Update property average rating
    await db.query(`
      UPDATE properties p
      SET 
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE property_id = ?),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE property_id = ?)
      WHERE p.id = ?
    `, [reviewData.property_id, reviewData.property_id, reviewData.property_id]);

    return result.insertId;
  },

  findByProperty: async (propertyId) => {
    const [rows] = await db.query(`
      SELECT r.*, u.name as user_name, u.profile_image,
        b.start_date, b.end_date
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      WHERE r.property_id = ?
      ORDER BY r.created_at DESC
    `, [propertyId]);
    return rows;
  },

  findByUser: async (userId) => {
    const [rows] = await db.query(`
      SELECT r.*, p.title as property_title, p.primary_image
      FROM reviews r
      JOIN properties p ON r.property_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);
    return rows;
  },

  update: async (id, data) => {
    await db.query(`
      UPDATE reviews 
      SET rating = ?, comment = ?, cleanliness = ?, communication = ?, value_for_money = ?
      WHERE id = ?
    `, [data.rating, data.comment, data.cleanliness, data.communication, data.value_for_money, id]);
    return true;
  },

  delete: async (id) => {
    const [review] = await db.query('SELECT property_id FROM reviews WHERE id = ?', [id]);
    await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    
    if (review[0]) {
      await db.query(`
        UPDATE properties p
        SET 
          avg_rating = (SELECT AVG(rating) FROM reviews WHERE property_id = ?),
          total_reviews = (SELECT COUNT(*) FROM reviews WHERE property_id = ?)
        WHERE p.id = ?
      `, [review[0].property_id, review[0].property_id, review[0].property_id]);
    }
    return true;
  },

  canReview: async (userId, propertyId) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE tenant_id = ? AND property_id = ? 
      AND status IN ('accepted', 'completed')
      AND id NOT IN (SELECT booking_id FROM reviews WHERE booking_id IS NOT NULL)
    `, [userId, propertyId]);
    return rows[0].count > 0;
  },

  getAverageRatings: async (propertyId) => {
    const [rows] = await db.query(`
      SELECT 
        AVG(rating) as overall,
        AVG(cleanliness) as cleanliness,
        AVG(communication) as communication,
        AVG(value_for_money) as value_for_money,
        COUNT(*) as total_reviews
      FROM reviews
      WHERE property_id = ?
    `, [propertyId]);
    return rows[0];
  }
};

module.exports = Review;
