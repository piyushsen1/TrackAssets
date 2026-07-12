import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function listNotifications(req: AuthedRequest, res: Response) {
  const page = Math.max(
    1,
    parseInt((req.query.page as string) ?? "1", 10) || 1,
  );
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt((req.query.pageSize as string) ?? "20", 10) || 20),
  );

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  res.json(
    notifications.map((notification) => ({
      eventId: notification.id,
      type: notification.type,
      message: notification.message,
      relatedEntityTag: notification.relatedEntityTag,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })),
  );
}

export async function markAsRead(req: AuthedRequest, res: Response) {
  const { eventId } = req.params;
  const notification = await prisma.notification.findUnique({
    where: { id: eventId },
  });
  if (!notification) {
    return res.status(404).json({ error: "notification_not_found" });
  }

  const updated = await prisma.notification.update({
    where: { id: eventId },
    data: { readAt: new Date() },
  });

  res.json({
    eventId: updated.id,
    readAt: updated.readAt,
  });
}
