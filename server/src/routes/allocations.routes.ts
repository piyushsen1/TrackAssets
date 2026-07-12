import { Router } from "express";
import * as allocationsController from "../controllers/allocations.controller";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.get("/allocations/:tag/current", allocationsController.getCurrentAllocation);
router.post("/allocations", allocationsController.createAllocation);
router.get("/allocations/:tag/history", allocationsController.getAllocationHistory);

router.post("/transfer-requests", allocationsController.createTransferRequest);
router.patch(
  "/transfer-requests/:requestId/approve",
  requireAdmin,
  allocationsController.approveTransferRequest
);
router.patch(
  "/transfer-requests/:requestId/reject",
  requireAdmin,
  allocationsController.rejectTransferRequest
);

export default router;
