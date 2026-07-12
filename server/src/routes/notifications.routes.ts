import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller";

const router = Router();

router.get("/", notificationsController.listNotifications);
router.patch("/:eventId/read", notificationsController.markAsRead);

export default router;
