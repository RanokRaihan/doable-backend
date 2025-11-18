import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";

const router = Router();

router.post("/online/initiate/:taskId", auth, authorize(["USER"]));
router.post("/cash/initiate/:taskId", auth, authorize(["USER"]));
router.patch("/cash/confirm/:paymentId", auth, authorize(["USER"]));

export default router;
