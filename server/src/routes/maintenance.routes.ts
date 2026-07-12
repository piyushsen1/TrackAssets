import { Router } from "express";
import * as maintenanceController from "../controllers/maintenance.controller";
import { requireRole } from "../middleware/requireRole";

const router = Router();
const canApproveMaintenance = requireRole("admin", "asset_manager");

router.get("/tickets", maintenanceController.listTickets);
router.post("/tickets", maintenanceController.raiseTicket);
router.patch(
  "/tickets/:ticketId/approve",
  canApproveMaintenance,
  maintenanceController.approveTicket
);
router.patch(
  "/tickets/:ticketId/reject",
  canApproveMaintenance,
  maintenanceController.rejectTicket
);
router.patch("/tickets/:ticketId/assign-technician", maintenanceController.assignTechnician);
router.patch("/tickets/:ticketId/start", maintenanceController.startTicket);
router.patch("/tickets/:ticketId/resolve", maintenanceController.resolveTicket);

export default router;
