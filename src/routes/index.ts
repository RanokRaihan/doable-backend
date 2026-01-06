import { Router } from "express";
import applicationRouter from "../modules/application/application.route";
import authRouter from "../modules/auth/auth.route";
import PaymentRouter from "../modules/payment/payment.route";
import taskRouter from "../modules/task/task.route";
import userRouter from "../modules/user/user.route";
import walletRouter from "../modules/wallet/wallet.route";
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
  {
    path: "/task",
    route: taskRouter,
  },
  {
    path: "/application",
    route: applicationRouter,
  },
  {
    path: "/payment",
    route: PaymentRouter,
  },
  {
    path: "/wallet",
    route: walletRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
