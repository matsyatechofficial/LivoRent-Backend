const db = require('../config/db');
const moment = require('moment');

class AnalyticsService {
    
    // Platform-wide analytics (Admin)
    async getPlatformAnalytics(timeRange = '30d') {
        try {
            const startDate = this.getStartDate(timeRange);
            
            // User Analytics
            const [userStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN role = 'tenant' THEN 1 ELSE 0 END) as total_tenants,
                    SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) as total_owners,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
                    DATE(created_at) as date
                FROM users 
                WHERE created_at >= ? AND role != 'admin'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [startDate]);

            // Property Analytics
            const [propertyStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_properties,
                    SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available_properties,
                    SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_properties,
                    SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_properties,
                    AVG(price) as avg_price,
                    SUM(view_count) as total_views,
                    DATE(created_at) as date
                FROM properties 
                WHERE created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [startDate]);

            // Booking Analytics
            const [bookingStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_booking_value,
                    DATE(created_at) as date
                FROM bookings 
                WHERE created_at >= ? AND payment_status = 'paid'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [startDate]);

            // Revenue by Month
            const [revenueByMonth] = await db.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    SUM(total_amount) as revenue,
                    COUNT(*) as booking_count
                FROM bookings 
                WHERE payment_status = 'paid'
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
                LIMIT 6
            `);

            // Top Properties
            const [topProperties] = await db.query(`
                SELECT 
                    p.id,
                    p.title,
                    p.price,
                    p.view_count,
                    u.name as owner_name,
                    COUNT(b.id) as booking_count,
                    COALESCE(AVG(r.rating), 0) as avg_rating
                FROM properties p
                LEFT JOIN bookings b ON p.id = b.property_id
                LEFT JOIN reviews r ON p.id = r.property_id
                JOIN users u ON p.owner_id = u.id
                GROUP BY p.id
                ORDER BY booking_count DESC, view_count DESC
                LIMIT 10
            `);

            return {
                userStats,
                propertyStats,
                bookingStats,
                revenueByMonth,
                topProperties
            };
        } catch (error) {
            console.error('Analytics Error:', error);
            throw new Error('Failed to fetch analytics data');
        }
    }

    // Owner-specific analytics
    async getOwnerAnalytics(ownerId, timeRange = '30d') {
        try {
            const startDate = this.getStartDate(timeRange);
            
            // Property Performance
            const [propertyPerformance] = await db.query(`
                SELECT 
                    p.id,
                    p.title,
                    p.price,
                    p.view_count,
                    p.is_available,
                    COUNT(DISTINCT b.id) as total_bookings,
                    COUNT(DISTINCT i.id) as total_inquiries,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as total_revenue
                FROM properties p
                LEFT JOIN bookings b ON p.id = b.property_id AND b.created_at >= ?
                LEFT JOIN inquiries i ON p.id = i.property_id AND i.created_at >= ?
                LEFT JOIN reviews r ON p.id = r.property_id
                WHERE p.owner_id = ?
                GROUP BY p.id
                ORDER BY total_revenue DESC
            `, [startDate, startDate, ownerId]);

            // Booking Trends
            const [bookingTrends] = await db.query(`
                SELECT 
                    DATE_FORMAT(b.created_at, '%Y-%m') as month,
                    COUNT(*) as booking_count,
                    SUM(b.total_amount) as revenue,
                    AVG(b.total_amount) as avg_booking_value
                FROM bookings b
                JOIN properties p ON b.property_id = p.id
                WHERE p.owner_id = ? AND b.payment_status = 'paid'
                GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
                ORDER BY month DESC
                LIMIT 6
            `, [ownerId]);

            // Occupancy Rate
            const [occupancyData] = await db.query(`
                SELECT 
                    p.id,
                    p.title,
                    COUNT(b.id) as booked_days,
                    30 as total_days, -- Assuming 30 days period
                    ROUND((COUNT(b.id) / 30) * 100, 2) as occupancy_rate
                FROM properties p
                LEFT JOIN bookings b ON p.id = b.property_id 
                    AND b.status = 'confirmed'
                    AND b.check_in_date >= ?
                    AND b.check_out_date <= DATE_ADD(?, INTERVAL 30 DAY)
                WHERE p.owner_id = ?
                GROUP BY p.id
            `, [startDate, startDate, ownerId]);

            // Inquiry Statistics
            const [inquiryStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_inquiries,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_inquiries,
                    SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded_inquiries,
                    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_response_time_hours
                FROM inquiries i
                JOIN properties p ON i.property_id = p.id
                WHERE p.owner_id = ? AND i.created_at >= ?
            `, [ownerId, startDate]);

            return {
                propertyPerformance,
                bookingTrends,
                occupancyData,
                inquiryStats
            };
        } catch (error) {
            console.error('Owner Analytics Error:', error);
            throw new Error('Failed to fetch owner analytics');
        }
    }

    // Tenant-specific analytics
    async getTenantAnalytics(tenantId, timeRange = '30d') {
        try {
            const startDate = this.getStartDate(timeRange);
            
            const [bookingHistory] = await db.query(`
                SELECT 
                    b.*,
                    p.title as property_title,
                    p.address as property_address,
                    u.name as owner_name,
                    DATEDIFF(b.check_out_date, b.check_in_date) as stay_duration,
                    (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as property_image
                FROM bookings b
                JOIN properties p ON b.property_id = p.id
                JOIN users u ON p.owner_id = u.id
                WHERE b.tenant_id = ? AND b.created_at >= ?
                ORDER BY b.created_at DESC
            `, [tenantId, startDate]);

            const [wishlistStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_wishlisted,
                    AVG(p.price) as avg_wishlist_price,
                    MIN(p.price) as min_wishlist_price,
                    MAX(p.price) as max_wishlist_price
                FROM wishlist w
                JOIN properties p ON w.property_id = p.id
                WHERE w.user_id = ?
            `, [tenantId]);

            const [searchHistory] = await db.query(`
                SELECT 
                    search_query,
                    COUNT(*) as search_count,
                    MAX(created_at) as last_searched
                FROM search_history
                WHERE user_id = ? AND created_at >= ?
                GROUP BY search_query
                ORDER BY search_count DESC
                LIMIT 10
            `, [tenantId, startDate]);

            return {
                bookingHistory,
                wishlistStats,
                searchHistory
            };
        } catch (error) {
            console.error('Tenant Analytics Error:', error);
            throw new Error('Failed to fetch tenant analytics');
        }
    }

    getStartDate(timeRange) {
        const now = moment();
        switch (timeRange) {
            case '7d':
                return now.subtract(7, 'days').format('YYYY-MM-DD');
            case '30d':
                return now.subtract(30, 'days').format('YYYY-MM-DD');
            case '90d':
                return now.subtract(90, 'days').format('YYYY-MM-DD');
            case '1y':
                return now.subtract(1, 'year').format('YYYY-MM-DD');
            default:
                return now.subtract(30, 'days').format('YYYY-MM-DD');
        }
    }
}

module.exports = new AnalyticsService();