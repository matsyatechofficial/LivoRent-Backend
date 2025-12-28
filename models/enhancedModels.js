const db = require('../config/db');

// Property Model
const Property = {
  // Create new property
  create: async (propertyData) => {
    const [result] = await db.query(
      `INSERT INTO properties (
        owner_id, title, description, property_type, price, address,
        city, state, country, postal_code, latitude, longitude,
        bedrooms, bathrooms, area_sqft, furnishing, amenities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyData.owner_id,
        propertyData.title,
        propertyData.description,
        propertyData.property_type,
        propertyData.price,
        propertyData.address,
        propertyData.city,
        propertyData.state,
        propertyData.country,
        propertyData.postal_code,
        propertyData.latitude,
        propertyData.longitude,
        propertyData.bedrooms,
        propertyData.bathrooms,
        propertyData.area_sqft,
        propertyData.furnishing,
        JSON.stringify(propertyData.amenities || [])
      ]
    );
    return result.insertId;
  },

  // Find property by ID with owner details
  findById: async (id) => {
    const [rows] = await db.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [id]);
    return rows[0];
  },

  // Find properties by owner
  findByOwner: async (ownerId) => {
    const [rows] = await db.query(
      'SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC',
      [ownerId]
    );
    return rows;
  },

  // Update property
  update: async (id, updateData) => {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (key === 'amenities') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updateData[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });
    
    values.push(id);
    
    const [result] = await db.query(
      `UPDATE properties SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  // Delete property
  delete: async (id) => {
    const [result] = await db.query(
      'DELETE FROM properties WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Search properties with filters
  search: async (filters) => {
    let query = `
      SELECT p.*, u.name as owner_name,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      (SELECT AVG(rating) FROM reviews WHERE property_id = p.id) as avg_rating
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.is_available = true
    `;
    
    const params = [];
    
    // Apply filters
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
    
    if (filters.furnishing) {
      query += ' AND p.furnishing = ?';
      params.push(filters.furnishing);
    }
    
    // Apply amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      filters.amenities.forEach((amenity, index) => {
        query += ` AND JSON_CONTAINS(p.amenities, '"${amenity}"')`;
      });
    }
    
    // Sorting
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
        query += ' ORDER BY avg_rating DESC';
        break;
      default:
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
    return rows;
  },

  // Get nearby properties
  findNearby: async (lat, lng, radius = 5, limit = 20) => {
    const [rows] = await db.query(`
      SELECT p.*, u.name as owner_name,
      (6371 * acos(
        cos(radians(?)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      )) as distance,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.is_available = true
      HAVING distance < ?
      ORDER BY distance
      LIMIT ?
    `, [lat, lng, lat, radius, limit]);
    
    return rows;
  },

  // Increment view count
  incrementViewCount: async (id) => {
    await db.query(
      'UPDATE properties SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  },

  // Get property stats for owner
  getOwnerStats: async (ownerId) => {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_properties,
        SUM(CASE WHEN is_available = true THEN 1 ELSE 0 END) as available_properties,
        SUM(price) as total_value,
        AVG(price) as avg_price
      FROM properties 
      WHERE owner_id = ?
    `, [ownerId]);
    
    return stats[0];
  }
};

// Property Images Model
const PropertyImage = {
  add: async (propertyId, imageUrl, isPrimary = false) => {
    const [result] = await db.query(
      'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, ?)',
      [propertyId, imageUrl, isPrimary]
    );
    return result.insertId;
  },

  getByProperty: async (propertyId) => {
    const [rows] = await db.query(
      'SELECT * FROM property_images WHERE property_id = ? ORDER BY is_primary DESC',
      [propertyId]
    );
    return rows;
  },

  setPrimary: async (imageId, propertyId) => {
    // First, set all images as non-primary
    await db.query(
      'UPDATE property_images SET is_primary = false WHERE property_id = ?',
      [propertyId]
    );
    
    // Then set the specified image as primary
    const [result] = await db.query(
      'UPDATE property_images SET is_primary = true WHERE id = ? AND property_id = ?',
      [imageId, propertyId]
    );
    
    return result.affectedRows > 0;
  },

  delete: async (imageId) => {
    const [result] = await db.query(
      'DELETE FROM property_images WHERE id = ?',
      [imageId]
    );
    return result.affectedRows > 0;
  }
};

// Booking Model
const Booking = {
  create: async (bookingData) => {
    const [result] = await db.query(
      `INSERT INTO bookings (
        property_id, tenant_id, owner_id, check_in_date, check_out_date,
        total_amount, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingData.property_id,
        bookingData.tenant_id,
        bookingData.owner_id,
        bookingData.check_in_date,
        bookingData.check_out_date,
        bookingData.total_amount,
        bookingData.status || 'pending',
        bookingData.payment_status || 'pending'
      ]
    );
    return result.insertId;
  },

  findById: async (id) => {
    const [rows] = await db.query(`
      SELECT b.*, p.title as property_title, u1.name as tenant_name, u2.name as owner_name
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users u1 ON b.tenant_id = u1.id
      JOIN users u2 ON b.owner_id = u2.id
      WHERE b.id = ?
    `, [id]);
    return rows[0];
  },

  findByTenant: async (tenantId) => {
    const [rows] = await db.query(`
      SELECT b.*, p.title, p.address, 
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as property_image
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.tenant_id = ?
      ORDER BY b.created_at DESC
    `, [tenantId]);
    return rows;
  },

  findByOwner: async (ownerId) => {
    const [rows] = await db.query(`
      SELECT b.*, p.title, u.name as tenant_name,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as property_image
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users u ON b.tenant_id = u.id
      WHERE b.owner_id = ?
      ORDER BY b.created_at DESC
    `, [ownerId]);
    return rows;
  },

  updateStatus: async (id, status) => {
    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },

  // Check property availability for dates
  checkAvailability: async (propertyId, checkInDate, checkOutDate) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE property_id = ?
      AND status IN ('pending', 'confirmed')
      AND (
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date >= ? AND check_out_date <= ?)
      )
    `, [propertyId, checkOutDate, checkInDate, checkInDate, checkOutDate, checkInDate, checkOutDate]);
    
    return rows[0].count === 0;
  }
};

// Wishlist Model
const Wishlist = {
  add: async (userId, propertyId) => {
    try {
      const [result] = await db.query(
        'INSERT INTO wishlist (user_id, property_id) VALUES (?, ?)',
        [userId, propertyId]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return 'already_exists';
      }
      throw error;
    }
  },

  remove: async (userId, propertyId) => {
    const [result] = await db.query(
      'DELETE FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return result.affectedRows > 0;
  },

  getUserWishlist: async (userId) => {
    const [rows] = await db.query(`
      SELECT p.*, 
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p
      JOIN wishlist w ON p.id = w.property_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);
    return rows;
  },

  isInWishlist: async (userId, propertyId) => {
    const [rows] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return rows.length > 0;
  }
};

// Inquiry Model
const Inquiry = {
  create: async (inquiryData) => {
    const [result] = await db.query(
      'INSERT INTO inquiries (property_id, user_id, message, status) VALUES (?, ?, ?, ?)',
      [inquiryData.property_id, inquiryData.user_id, inquiryData.message, 'pending']
    );
    return result.insertId;
  },

  getByPropertyOwner: async (ownerId) => {
    const [rows] = await db.query(`
      SELECT i.*, p.title as property_title, u.name as user_name, u.email as user_email
      FROM inquiries i
      JOIN properties p ON i.property_id = p.id
      JOIN users u ON i.user_id = u.id
      WHERE p.owner_id = ?
      ORDER BY i.created_at DESC
    `, [ownerId]);
    return rows;
  },

  updateStatus: async (id, status) => {
    const [result] = await db.query(
      'UPDATE inquiries SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }
};

// Review Model
const Review = {
  create: async (reviewData) => {
    const [result] = await db.query(
      'INSERT INTO reviews (property_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [reviewData.property_id, reviewData.user_id, reviewData.rating, reviewData.comment]
    );
    return result.insertId;
  },

  getByProperty: async (propertyId) => {
    const [rows] = await db.query(`
      SELECT r.*, u.name as user_name, u.profile_picture
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.property_id = ?
      ORDER BY r.created_at DESC
    `, [propertyId]);
    return rows;
  },

  getPropertyRating: async (propertyId) => {
    const [rows] = await db.query(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews
      WHERE property_id = ?
    `, [propertyId]);
    return rows[0];
  }
};

// User Management Model
const UserManagement = {
  // Get all users with role filtering
  getAllUsers: async (role = null) => {
    let query = `
      SELECT id, name, email, role, is_active, created_at
      FROM users
      WHERE role != 'admin'
    `;
    
    const params = [];
    
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  },

  // Update user status
  updateUserStatus: async (userId, isActive) => {
    const [result] = await db.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive, userId]
    );
    return result.affectedRows > 0;
  },

  // Get user statistics
  getUserStats: async () => {
    const [stats] = await db.query(`
      SELECT 
        role,
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_users,
        DATE(created_at) as signup_date
      FROM users
      WHERE role != 'admin'
      GROUP BY role, DATE(created_at)
      ORDER BY signup_date DESC
    `);
    return stats;
  },

  // Verify property owner
  verifyOwner: async (ownerId) => {
    const [result] = await db.query(
      'UPDATE properties SET verified = true WHERE owner_id = ?',
      [ownerId]
    );
    return result.affectedRows > 0;
  },

  // Get owner verification requests
  getVerificationRequests: async () => {
    const [rows] = await db.query(`
      SELECT u.id as user_id, u.name, u.email, u.created_at as user_since,
      COUNT(p.id) as total_properties,
      SUM(CASE WHEN p.verified = true THEN 1 ELSE 0 END) as verified_properties
      FROM users u
      LEFT JOIN properties p ON u.id = p.owner_id
      WHERE u.role = 'owner'
      GROUP BY u.id
      HAVING verified_properties < total_properties OR total_properties = 0
      ORDER BY user_since DESC
    `);
    return rows;
  }
};

module.exports = {
  Property,
  PropertyImage,
  Booking,
  Wishlist,
  Inquiry,
  Review,
  UserManagement
};