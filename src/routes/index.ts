import { Router } from "express";
import demoRoute from "./demo.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/demo",
    route: demoRoute,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
