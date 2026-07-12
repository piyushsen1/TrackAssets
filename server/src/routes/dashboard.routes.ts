import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.get("/overview", dashboardController.getOverview);
router.get("/alerts", dashboardController.getAlerts);
router.get("/recent-activity", dashboardController.getRecentActivity);

export default router;
