import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ptsRouter from "./pts";
import dashboardRouter from "./dashboard";
import activitiesRouter from "./activities";
import findingsRouter from "./findings";
import reportsRouter from "./reports";
import branchesRouter from "./branches";
import reviewsRouter from "./reviews";
import signoffsRouter from "./signoffs";
import auditLogsRouter from "./audit-logs";
import kpiRouter from "./kpi";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ptsRouter);
router.use(dashboardRouter);
router.use(activitiesRouter);
router.use(findingsRouter);
router.use(reportsRouter);
router.use(branchesRouter);
router.use(reviewsRouter);
router.use(signoffsRouter);
router.use(auditLogsRouter);
router.use(kpiRouter);
router.use(notificationsRouter);

export default router;
