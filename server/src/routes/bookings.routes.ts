import { Router } from "express";
import * as bookingsController from "../controllers/bookings.controller";
import { requireRole } from "../middleware/requireRole";

const router = Router();
const canManageResources = requireRole("admin", "asset_manager");

router.get("/resources", bookingsController.listResources);
router.post("/resources", canManageResources, bookingsController.createResource);
router.get("/resources/:resourceId/availability", bookingsController.getResourceAvailability);
router.post("/bookings", bookingsController.createBooking);
router.patch("/bookings/:bookingId", bookingsController.rescheduleBooking);
router.delete("/bookings/:bookingId", bookingsController.cancelBooking);

export default router;
