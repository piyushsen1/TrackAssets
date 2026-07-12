import { Router } from "express";
import * as bookingsController from "../controllers/bookings.controller";

const router = Router();

router.get("/resources", bookingsController.listResources);
router.get("/resources/:resourceId/availability", bookingsController.getResourceAvailability);
router.post("/bookings", bookingsController.createBooking);
router.delete("/bookings/:bookingId", bookingsController.cancelBooking);

export default router;
