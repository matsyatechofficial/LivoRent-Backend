const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const ExportController = require('../controllers/exportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Platform Analytics (Admin only)
router.get('/platform', 
    authMiddleware, 
    roleMiddleware(['admin']), 
    async (req, res) => {
        try {
            const { timeRange } = req.query;
            const analytics = await AnalyticsService.getPlatformAnalytics(timeRange);
            res.json(analytics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Owner Analytics
router.get('/owner', 
    authMiddleware, 
    roleMiddleware(['owner']), 
    async (req, res) => {
        try {
            const { timeRange } = req.query;
            const analytics = await AnalyticsService.getOwnerAnalytics(req.user.id, timeRange);
            res.json(analytics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Tenant Analytics
router.get('/tenant', 
    authMiddleware, 
    roleMiddleware(['tenant']), 
    async (req, res) => {
        try {
            const { timeRange } = req.query;
            const analytics = await AnalyticsService.getTenantAnalytics(req.user.id, timeRange);
            res.json(analytics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Export Routes
router.get('/export/users', 
    authMiddleware, 
    roleMiddleware(['admin']), 
    ExportController.exportUsers
);

router.get('/export/properties', 
    authMiddleware, 
    roleMiddleware(['admin', 'owner']), 
    ExportController.exportProperties
);

router.get('/export/bookings', 
    authMiddleware, 
    roleMiddleware(['admin', 'owner']), 
    ExportController.exportBookings
);

module.exports = router;