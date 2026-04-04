import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ptsRouter from "./pts";
import dashboardRouter from "./dashboard";
import activitiesRouter from "./activities";
import findingsRouter from "./findings";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ptsRouter);
router.use(dashboardRouter);
router.use(activitiesRouter);
router.use(findingsRouter);
router.use(reportsRouter);

export default router;
