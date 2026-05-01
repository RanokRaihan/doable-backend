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
  loginValidationSchema,
  verifyEmailValidationSchema,
} from "./auth.validation";

const router = Router();

router.post("/login", validateRequest(loginValidationSchema), loginController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);
router.get("/current-user", auth, getCurrentUserController);
router.get("/loggedin-user", auth, getCurrentUserController);
router.post("/update-password", auth, changePasswordController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
// email verfication
router.get("/email-verification", auth, getEmailVerificationDataController);
router.post("/send-verification-email", auth, sendVerificationController);
router.post(
  "/verify-email",
  validateRequest(verifyEmailValidationSchema),
  verifyEmailController,
);

export default router;
