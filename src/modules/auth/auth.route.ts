import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  changePasswordController,
  forgotPasswordController,
  getCurrentUserController,
  loginController,
  logoutController,
  refreshTokenController,
  resetPasswordController,
} from "./auth.controller";
import { loginValidationSchema } from "./auth.validation";

const router = Router();

router.post("/login", validateRequest(loginValidationSchema), loginController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);
router.get("/me", auth, getCurrentUserController);
router.post("/update-password", auth, changePasswordController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

export default router;
