import { Router } from "express";
import * as allocationsController from "../controllers/allocations.controller";
import { requireRole } from "../middleware/requireRole";

const router = Router();
const canApproveTransfer = requireRole("admin", "asset_manager", "department_head");

router.get("/allocations/:tag/current", allocationsController.getCurrentAllocation);
router.post("/allocations", allocationsController.createAllocation);
router.get("/allocations/:tag/history", allocationsController.getAllocationHistory);

router.post("/transfer-requests", allocationsController.createTransferRequest);
router.patch(
  "/transfer-requests/:requestId/approve",
  canApproveTransfer,
  allocationsController.approveTransferRequest
);
router.patch(
  "/transfer-requests/:requestId/reject",
  canApproveTransfer,
  allocationsController.rejectTransferRequest
);

export default router;
