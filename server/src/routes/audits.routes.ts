import { Router } from "express";
import * as auditsController from "../controllers/audits.controller";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.post("/", requireAdmin, auditsController.startAudit);
router.patch("/:auditId/line-items/:tag", auditsController.updateLineItem);
router.get("/:auditId/discrepancies", auditsController.getDiscrepancies);
router.post("/:auditId/close", requireAdmin, auditsController.closeAudit);

export default router;
