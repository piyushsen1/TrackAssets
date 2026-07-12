import { Router } from "express";
import * as bookingsController from "../controllers/bookings.controller";
import { requireRole } from "../middleware/requireRole";

const router = Router();
const canManageResources = requireRole("admin", "asset_manager");

router.get("/resources", bookingsController.listResources);
router.post("/resources", canManageResources, bookingsController.createResource);
router.patch("/resources/:resourceId", canManageResources, bookingsController.updateResource);
router.delete("/resources/:resourceId", canManageResources, bookingsController.deleteResource);
router.get("/resources/:resourceId/availability", bookingsController.getResourceAvailability);
router.get("/bookings", bookingsController.listBookings);
router.post("/bookings", bookingsController.createBooking);
router.patch("/bookings/:bookingId", bookingsController.rescheduleBooking);
router.delete("/bookings/:bookingId", bookingsController.cancelBooking);

export default router;
