import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { loginController, logoutController } from "./auth.controller";
import { loginValidationSchema } from "./auth.validation";

const router = Router();

router.post("/login", validateRequest(loginValidationSchema), loginController);
router.post("/logout", logoutController);
// router.get("/me", getCurrentUserController);

export default router;
