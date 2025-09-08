import { Router } from "express";
import authRouter from "../modules/auth/auth.route";
import userRouter from "../modules/user/user.route";
import demoRoute from "./demo.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/demo",
    route: demoRoute,
  },
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/auth",
    route: authRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
