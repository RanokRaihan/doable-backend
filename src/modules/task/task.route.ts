import { Router } from "express";

// Defines task-related API routes
const router = Router();

router.get("/", (_req, res) => {
  res.send("Get all tasks");
});

export default router;
