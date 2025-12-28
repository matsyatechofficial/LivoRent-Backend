const { Parser } = require('json2csv');
const db = require('../config/db');

class ExportController {
    
    async exportUsers(req, res) {
        try {
            const { role, startDate, endDate } = req.query;
            
            let query = `
                SELECT 
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM users
                WHERE role != 'admin'
            `;
            
            const params = [];
            
            if (role) {
                query += ' AND role = ?';
                params.push(role);
            }
            
            if (startDate) {
                query += ' AND created_at >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND created_at <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY created_at DESC';
            
            const [users] = await db.query(query, params);
            
            // Convert to CSV
            const fields = [
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'updated_at'
            ];
            
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(users);
            
            // Set headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
            
            res.send(csv);
        } catch (error) {
            console.error('Export Error:', error);
            res.status(500).json({ message: 'Failed to export users' });
        }
    }
    
    async exportProperties(req, res) {
        try {
            const { ownerId, isAvailable, verified } = req.query;
            
            let query = `
                SELECT 
                    p.id,
                    p.title,
                    p.property_type,
                    p.price,
                    p.address,
                    p.city,
                    p.state,
                    p.country,
                    p.bedrooms,
                    p.bathrooms,
                    p.area_sqft,
                    p.furnishing,
                    p.is_available,
                    p.verified,
                    p.featured,
                    p.view_count,
                    u.name as owner_name,
                    u.email as owner_email,
                    DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM properties p
                JOIN users u ON p.owner_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (ownerId) {
                query += ' AND p.owner_id = ?';
                params.push(ownerId);
            }
            
            if (isAvailable !== undefined) {
                query += ' AND p.is_available = ?';
                params.push(isAvailable === 'true' ? 1 : 0);
            }
            
            if (verified !== undefined) {
                query += ' AND p.verified = ?';
                params.push(verified === 'true' ? 1 : 0);
            }
            
            query += ' ORDER BY p.created_at DESC';
            
            const [properties] = await db.query(query, params);
            
            // Convert to CSV
            const fields = [
                'id',
                'title',
                'property_type',
                'price',
                'address',
                'city',
                'state',
                'country',
                'bedrooms',
                'bathrooms',
                'area_sqft',
                'furnishing',
                'is_available',
                'verified',
                'featured',
                'view_count',
                'owner_name',
                'owner_email',
                'created_at',
                'updated_at'
            ];
            
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(properties);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=properties.csv');
            
            res.send(csv);
        } catch (error) {
            console.error('Export Error:', error);
            res.status(500).json({ message: 'Failed to export properties' });
        }
    }
    
    async exportBookings(req, res) {
        try {
            const { status, startDate, endDate } = req.query;
            
            let query = `
                SELECT 
                    b.id,
                    p.title as property_title,
                    t.name as tenant_name,
                    t.email as tenant_email,
                    o.name as owner_name,
                    o.email as owner_email,
                    b.check_in_date,
                    b.check_out_date,
                    b.total_amount,
                    b.status,
                    b.payment_status,
                    DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(b.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM bookings b
                JOIN properties p ON b.property_id = p.id
                JOIN users t ON b.tenant_id = t.id
                JOIN users o ON b.owner_id = o.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (status) {
                query += ' AND b.status = ?';
                params.push(status);
            }
            
            if (startDate) {
                query += ' AND b.check_in_date >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND b.check_out_date <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY b.created_at DESC';
            
            const [bookings] = await db.query(query, params);
            
            // Convert to CSV
            const fields = [
                'id',
                'property_title',
                'tenant_name',
                'tenant_email',
                'owner_name',
                'owner_email',
                'check_in_date',
                'check_out_date',
                'total_amount',
                'status',
                'payment_status',
                'created_at',
                'updated_at'
            ];
            
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(bookings);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
            
            res.send(csv);
        } catch (error) {
            console.error('Export Error:', error);
            res.status(500).json({ message: 'Failed to export bookings' });
        }
    }
}

module.exports = new ExportController();