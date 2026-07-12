import { Router } from "express";
import * as reportsController from "../controllers/reports.controller";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();
router.use(requireAdmin);

router.get("/utilization-by-department", reportsController.utilizationByDepartment);
router.get("/maintenance-frequency", reportsController.maintenanceFrequency);
router.get("/most-used-assets", reportsController.mostUsedAssets);
router.get("/idle-assets", reportsController.idleAssets);
router.get("/due-for-maintenance", reportsController.dueForMaintenance);
router.get("/export", reportsController.exportReport);

export default router;
