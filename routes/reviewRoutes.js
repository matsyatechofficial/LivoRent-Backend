const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware('tenant'), reviewController.create);
router.get('/property/:propertyId', reviewController.getByProperty);
router.get('/my-reviews', authMiddleware, reviewController.getMyReviews);
router.put('/:id', authMiddleware, reviewController.update);
router.delete('/:id', authMiddleware, reviewController.delete);

module.exports = router;