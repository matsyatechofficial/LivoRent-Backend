const express = require("express")

const wishlistRouter = express.Router();
const { wishlistController } = require('../controllers/propertyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All wishlist routes require tenant authentication
wishlistRouter.use(authMiddleware);
wishlistRouter.use(roleMiddleware('tenant'));

wishlistRouter.get('/', wishlistController.getWishlist);
wishlistRouter.post('/', wishlistController.add);
wishlistRouter.delete('/:propertyId', wishlistController.remove);

module.exports = wishlistRouter;