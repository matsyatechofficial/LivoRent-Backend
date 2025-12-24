const express = require("express")
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const userRouter = express.Router();
const { userController } = require('../controllers/propertyController');

// All user routes require authentication
userRouter.use(authMiddleware);

// Admin routes
userRouter.get(
  '/',
  roleMiddleware('admin'),
  userController.getAll
);

userRouter.patch(
  '/:id/verify',
  roleMiddleware('admin'),
  userController.verifyUser
);

userRouter.patch(
  '/:id/status',
  roleMiddleware('admin'),
  userController.toggleStatus
);

// User routes
userRouter.get('/:id', userController.getById);
userRouter.put('/:id', userController.updateUser);

module.exports = userRouter;