import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  changePasswordController,
  forgotPasswordController,
  getCurrentUserController,
  getEmailVerificationDataController,
  loginController,
  logoutController,
  refreshTokenController,
  resetPasswordController,
  sendVerificationController,
  verifyEmailController,
} from "./auth.controller";
import {
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  loginValidationSchema,
  resetPasswordValidationSchema,
  verifyEmailValidationSchema,
} from "./auth.validation";

const router = Router();

router.post("/login", validateRequest(loginValidationSchema), loginController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);
router.get("/current-user", auth, getCurrentUserController);
router.get("/loggedin-user", auth, getCurrentUserController);
router.post("/update-password", auth, validateRequest(changePasswordValidationSchema), changePasswordController);
router.post("/forgot-password", validateRequest(forgotPasswordValidationSchema), forgotPasswordController);
router.post("/reset-password", validateRequest(resetPasswordValidationSchema), resetPasswordController);
// email verification
router.get("/email-verification", auth, getEmailVerificationDataController);
router.post("/send-verification-email", auth, sendVerificationController);
router.post(
  "/verify-email",
  validateRequest(verifyEmailValidationSchema),
  verifyEmailController,
);

export default router;
