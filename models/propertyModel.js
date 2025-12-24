// ========================================
// models/propertyModel.js (NEW)
// ========================================

// ========================================
// models/propertyModel.js (FIXED)
// ========================================
const db = require('../config/db');
function safeParse(value) {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

const Property = {
  create: async (propertyData) => {
    const latitude = propertyData.latitude ? parseFloat(propertyData.latitude) : null;
    const longitude = propertyData.longitude ? parseFloat(propertyData.longitude) : null;

    const is_available = propertyData.is_available === undefined ? true : Boolean(propertyData.is_available);
    const instant_booking = propertyData.instant_booking === undefined ? false : Boolean(propertyData.instant_booking);

    const [result] = await db.query(
      `INSERT INTO properties (
        owner_id, title, description, property_type, address, city, state, country,
        postal_code, latitude, longitude, price, bedrooms, bathrooms, area_sqft,
        furnishing, amenities, nearby_places, primary_image, images, video_url,
        is_available, instant_booking
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyData.owner_id, propertyData.title, propertyData.description,
        propertyData.property_type, propertyData.address, propertyData.city,
        propertyData.state, propertyData.country, propertyData.postal_code,
        latitude, longitude, propertyData.price,
        propertyData.bedrooms, propertyData.bathrooms, propertyData.area_sqft,
        propertyData.furnishing, JSON.stringify(propertyData.amenities || []),
        JSON.stringify(propertyData.nearby_places || []),
        propertyData.primary_image, JSON.stringify(propertyData.images || []),
        propertyData.video_url, is_available, instant_booking
      ]
    );

    return result.insertId;
  },

  // ✅ Naya thapiyeko function (List + Total Count)
  findAllWithCount: async (filters = {}) => {
    let whereClause = ' WHERE 1=1';
    const params = [];

    // Filter Logic
    if (filters.city) {
      whereClause += ' AND p.city LIKE ?';
      params.push(`%${filters.city}%`);
    }
    if (filters.property_type) {
      whereClause += ' AND p.property_type = ?';
      params.push(filters.property_type);
    }
    if (filters.min_price) {
      whereClause += ' AND p.price >= ?';
      params.push(filters.min_price);
    }
    if (filters.max_price) {
      whereClause += ' AND p.price <= ?';
      params.push(filters.max_price);
    }

    // 1. Total Count Query
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM properties p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // 2. Data Query
    let query = `
      SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      ${whereClause}
    `;

    // Sorting
    if (filters.sort_by) {
      if (filters.sort_by === 'price_low') query += ' ORDER BY p.price ASC';
      else if (filters.sort_by === 'price_high') query += ' ORDER BY p.price DESC';
      else query += ' ORDER BY p.created_at DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    // Pagination
    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset) || 0);
    }

    const [rows] = await db.query(query, params);

    const properties = rows.map(row => ({
      ...row,
      amenities: safeParse(row.amenities),
      nearby_places: safeParse(row.nearby_places),
      images: safeParse(row.images)
    }));

    return { properties, total };
  },

  findAll: async (filters = {}) => {
    let query = `
      SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email,
      (SELECT COUNT(*) FROM wishlist w WHERE w.property_id = p.id) as wishlist_count
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.city) {
      query += ' AND p.city LIKE ?';
      params.push(`%${filters.city}%`);
    }

    if (filters.property_type) {
      query += ' AND p.property_type = ?';
      params.push(filters.property_type);
    }

    if (filters.min_price) {
      query += ' AND p.price >= ?';
      params.push(filters.min_price);
    }

    if (filters.max_price) {
      query += ' AND p.price <= ?';
      params.push(filters.max_price);
    }

    if (filters.bedrooms) {
      query += ' AND p.bedrooms >= ?';
      params.push(filters.bedrooms);
    }

    if (filters.bathrooms) {
      query += ' AND p.bathrooms >= ?';
      params.push(filters.bathrooms);
    }

    if (filters.furnishing) {
      query += ' AND p.furnishing = ?';
      params.push(filters.furnishing);
    }

    if (filters.instant_booking) {
      query += ' AND p.instant_booking = TRUE';
    }

    if (filters.is_available !== undefined) {
      query += ' AND p.is_available = ?';
      params.push(filters.is_available);
    }

    if (filters.is_verified) {
      query += ' AND p.is_verified = TRUE';
    }

    // Sorting
    if (filters.sort_by) {
      switch (filters.sort_by) {
        case 'price_low':
          query += ' ORDER BY p.price ASC';
          break;
        case 'price_high':
          query += ' ORDER BY p.price DESC';
          break;
        case 'newest':
          query += ' ORDER BY p.created_at DESC';
          break;
        case 'most_viewed':
          query += ' ORDER BY p.view_count DESC';
          break;
        case 'rating':
          query += ' ORDER BY p.avg_rating DESC';
          break;
        default:
          query += ' ORDER BY p.created_at DESC';
      }
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    // Pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const [rows] = await db.query(query, params);

    return rows.map(row => ({
      ...row,
      amenities: safeParse(row.amenities),
      nearby_places: safeParse(row.nearby_places),
      images: safeParse(row.images)
    }));
  },

  findById: async (id, userId = null) => {
    let query = `
      SELECT p.*, u.name as owner_name, u.phone as owner_phone, 
      u.email as owner_email, u.is_verified as owner_verified
    `;
    
    if (userId) {
      query += `, (SELECT COUNT(*) FROM wishlist w WHERE w.property_id = p.id AND w.user_id = ?) as inWishlist`;
    }
    
    query += ` FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?`;
    
    const params = userId ? [userId, id] : [id];
    const [rows] = await db.query(query, params);

    if (rows.length === 0) return null;

    const property = rows[0];
    
    let parsedImages = [];
    if (property.images) {
      if (typeof property.images === 'string') {
        try {
          parsedImages = JSON.parse(property.images);
        } catch (e) {
          console.error('Failed to parse images:', e);
          parsedImages = [];
        }
      } else if (Array.isArray(property.images)) {
        parsedImages = property.images;
      }
    }
    
    return {
      ...property,
      amenities: safeParse(property.amenities),
      nearby_places: safeParse(property.nearby_places),
      images: parsedImages, 
      inWishlist: userId ? Boolean(property.inWishlist) : false
    };
  },

  findByOwner: async (ownerId) => {
    const [rows] = await db.query(
      `SELECT p.*, 
      (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.id AND b.status = 'pending') as pending_bookings,
      (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.id AND b.status = 'accepted') as active_bookings
      FROM properties p
      WHERE p.owner_id = ?
      ORDER BY p.created_at DESC`,
      [ownerId]
    );

    return rows.map(row => ({
      ...row,
      amenities: safeParse(row.amenities),
      nearby_places: safeParse(row.nearby_places),
      images: safeParse(row.images)
    }));
  },

  update: async (id, propertyData) => {
    const fields = [];
    const values = [];

    Object.keys(propertyData).forEach(key => {
      if (propertyData[key] !== undefined && key !== 'id' && key !== 'owner_id') {
        fields.push(`${key} = ?`);

        if (key === 'amenities' || key === 'images' || key === 'nearby_places') {
          values.push(JSON.stringify(propertyData[key]));
        } else {
          values.push(propertyData[key]);
        }
      }
    });

    values.push(id);

    const [result] = await db.query(
      `UPDATE properties SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM properties WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  incrementViewCount: async (id) => {
    await db.query('UPDATE properties SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  updateRating: async (propertyId) => {
    await db.query(`
      UPDATE properties p
      SET 
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE property_id = ?),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE property_id = ?)
      WHERE p.id = ?`,
      [propertyId, propertyId, propertyId]
    );
  },

  getFeatured: async (limit = 6) => {
    const [rows] = await db.query(
      `SELECT p.*, u.name as owner_name
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.is_featured = TRUE AND p.is_available = TRUE
      ORDER BY p.created_at DESC
      LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      ...row,
      amenities: safeParse(row.amenities),
      images: safeParse(row.images)
    }));
  },

  findNearby: async (latitude, longitude, radiusKm = 10) => {
    const [rows] = await db.query(
      `SELECT p.*, u.name as owner_name,
      (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      AND p.is_available = TRUE
      HAVING distance < ?
      ORDER BY distance
      LIMIT 20`,
      [latitude, longitude, latitude, radiusKm]
    );

    return rows.map(row => ({
      ...row,
      amenities: safeParse(row.amenities),
      images: safeParse(row.images)
    }));
  }
};
module.exports = { Property };


// ========================================
// models/bookingModel.js (NEW)
// ========================================
const Booking = {
  // Create booking
  create: async (bookingData) => {
    const [result] = await db.query(
      `INSERT INTO bookings (
        property_id, tenant_id, owner_id, start_date, end_date, message, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingData.property_id, bookingData.tenant_id, bookingData.owner_id,
        bookingData.start_date, bookingData.end_date, bookingData.message,
        bookingData.total_amount
      ]
    );
    return result.insertId;
  },

  // Find all bookings (with filters)
  findAll: async (filters = {}) => {
    let query = `
      SELECT b.*, p.title as property_title, p.address as property_address,
      p.primary_image as property_image, p.price as property_price,
      t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
      o.name as owner_name, o.email as owner_email, o.phone as owner_phone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users t ON b.tenant_id = t.id
      JOIN users o ON b.owner_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.tenant_id) {
      query += ' AND b.tenant_id = ?';
      params.push(filters.tenant_id);
    }

    if (filters.owner_id) {
      query += ' AND b.owner_id = ?';
      params.push(filters.owner_id);
    }

    if (filters.property_id) {
      query += ' AND b.property_id = ?';
      params.push(filters.property_id);
    }

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY b.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  },

  // Find booking by ID
  findById: async (id) => {
    const [rows] = await db.query(
      `SELECT b.*, p.title as property_title, p.address as property_address,
      p.primary_image as property_image, p.price as property_price,
      t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
      o.name as owner_name, o.email as owner_email, o.phone as owner_phone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users t ON b.tenant_id = t.id
      JOIN users o ON b.owner_id = o.id
      WHERE b.id = ?`,
      [id]
    );
    return rows[0];
  },

  // Update booking status
  updateStatus: async (id, status) => {
    const [result] = await db.query(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },

  // Delete booking
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM bookings WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Check availability
  checkAvailability: async (propertyId, startDate, endDate, excludeBookingId = null) => {
    let query = `
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ?
      AND status IN ('pending', 'accepted')
      AND (
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
      )
    `;
    const params = [propertyId, startDate, startDate, endDate, endDate, startDate, endDate];

    if (excludeBookingId) {
      query += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count === 0;
  },

  // Get booking dates for calendar
  getBookedDates: async (propertyId) => {
    const [rows] = await db.query(
      `SELECT start_date, end_date FROM bookings
      WHERE property_id = ? AND status IN ('pending', 'accepted')`,
      [propertyId]
    );
    return rows;
  }
};

// ========================================
// models/wishlistModel.js (NEW)
// ========================================
const Wishlist = {
  // Add to wishlist
  add: async (userId, propertyId) => {
    try {
      const [result] = await db.query(
        'INSERT INTO wishlist (user_id, property_id) VALUES (?, ?)',
        [userId, propertyId]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Property already in wishlist');
      }
      throw error;
    }
  },

  // Remove from wishlist
  remove: async (userId, propertyId) => {
    const [result] = await db.query(
      'DELETE FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return result.affectedRows > 0;
  },

  // Get user wishlist
  getUserWishlist: async (userId) => {
    const [rows] = await db.query(
      `SELECT p.*, u.name as owner_name, w.created_at as added_at
      FROM wishlist w
      JOIN properties p ON w.property_id = p.id
      JOIN users u ON p.owner_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC`,
      [userId]
    );
    
    return rows.map(row => ({
      ...row,
      amenities: JSON.parse(row.amenities || '[]'),
      images: JSON.parse(row.images || '[]')
    }));
  },

  // Check if property is in wishlist
  isInWishlist: async (userId, propertyId) => {
    const [rows] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return rows.length > 0;
  }
};

// ========================================
// models/reviewModel.js (NEW)
// ========================================
const Review = {
  // Create review
  create: async (reviewData) => {
    const [result] = await db.query(
      'INSERT INTO reviews (property_id, user_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [reviewData.property_id, reviewData.user_id, reviewData.booking_id, reviewData.rating, reviewData.comment]
    );
    return result.insertId;
  },

  // Get property reviews
  getByProperty: async (propertyId) => {
    const [rows] = await db.query(
      `SELECT r.*, u.name as user_name, u.profile_image
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.property_id = ?
      ORDER BY r.created_at DESC`,
      [propertyId]
    );
    return rows;
  },

  // Update review
  update: async (id, data) => {
    const [result] = await db.query(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [data.rating, data.comment, id]
    );
    return result.affectedRows > 0;
  },

  // Delete review
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Check if user can review
  canReview: async (userId, propertyId) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM bookings
      WHERE tenant_id = ? AND property_id = ? AND status = 'completed'`,
      [userId, propertyId]
    );
    return rows[0].count > 0;
  }
};

module.exports = { Property, Booking, Wishlist, Review };