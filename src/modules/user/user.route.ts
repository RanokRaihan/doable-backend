import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  completeUserProfileController,
  createUserController,
  deleteAccountController,
  getAllUsersController,
  getUserByIdController,
  getUserProfileController,
  updateUserAvatarController,
  updateUserController,
} from "./user.controller";
import {
  completeUserProfileSchema,
  createUserSchema,
  updateAvatarSchema,
  updateUserSchema,
} from "./user.validator";

const router = Router();

// temporary route to get all users; to be removed later
router.get("/", getAllUsersController);

// POST /users - Create new user with credentials
router.post(
  "/register/credentials",
  validateRequest(createUserSchema),
  createUserController
);
// get user public profile by id
router.get("/:id", getUserByIdController);
// get user profile
router.get("/my-profile", auth, authorize(["USER"]), getUserProfileController);
router.patch(
  "/complete-profile",
  auth,
  authorize(["USER"]),
  validateRequest(completeUserProfileSchema),
  completeUserProfileController
);

// update user profile
router.patch(
  "/update-profile",
  auth,
  authorize(["USER"]),
  validateRequest(updateUserSchema),
  updateUserController
);
// update user avatar
router.patch(
  "/update-avatar",
  auth,
  authorize(["USER"]),
  validateRequest(updateAvatarSchema),
  updateUserAvatarController
);

// delete user account. soft delete
router.delete(
  "/delete-account",
  auth,
  authorize(["USER"]),
  deleteAccountController
);
export default router;
