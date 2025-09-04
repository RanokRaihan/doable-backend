import { Router } from "express";
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
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
