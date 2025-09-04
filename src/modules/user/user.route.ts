import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import {
  createUserController,
  getAllUsersController,
  getUserByIdController,
} from "./user.controller";
import { createUserSchema } from "./user.validator";

const router = Router();

// POST /users - Create new user with credentials
router.post(
  "/register/credentials",
  validateRequest(createUserSchema),
  createUserController
);
// GET /users - Get all users
router.get("/", getAllUsersController);

// // GET /users/:id - Get user by ID
router.get("/:id", getUserByIdController);

// // PUT /users/:id - Update user
// router.put('/:id', userController.updateUser);

// // DELETE /users/:id - Delete user
// router.delete('/:id', userController.deleteUser);

// // GET /users/:id/profile - Get user profile
// router.get('/:id/profile', userController.getUserProfile);

// // PUT /users/:id/profile - Update user profile
// router.put('/:id/profile', userController.updateUserProfile);

export default router;
