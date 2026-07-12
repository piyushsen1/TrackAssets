import { Router } from "express";
import * as maintenanceController from "../controllers/maintenance.controller";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.get("/tickets", maintenanceController.listTickets);
router.post("/tickets", maintenanceController.raiseTicket);
router.patch("/tickets/:ticketId/approve", requireAdmin, maintenanceController.approveTicket);
router.patch("/tickets/:ticketId/assign-technician", maintenanceController.assignTechnician);
router.patch("/tickets/:ticketId/start", maintenanceController.startTicket);
router.patch("/tickets/:ticketId/resolve", maintenanceController.resolveTicket);

export default router;
