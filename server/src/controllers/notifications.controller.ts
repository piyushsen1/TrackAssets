import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";
import type { NotificationType } from "@prisma/client";

const VALID_TYPES: NotificationType[] = [
  "alert",
  "approval",
  "booking",
  "transfer",
  "allocation",
  "audit",
];

export async function listNotifications(req: AuthedRequest, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) ?? "20", 10) || 20));
  const type = req.query.type as string | undefined;

  if (type && type !== "all" && !VALID_TYPES.includes(type as NotificationType)) {
    return res.status(400).json({ error: "invalid_type", allowed: ["all", ...VALID_TYPES] });
  }

  const where = type && type !== "all" ? { type: type as NotificationType } : undefined;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  res.json({
    items: items.map((notification) => ({
      eventId: notification.id,
      type: notification.type,
      message: notification.message,
      relatedEntityTag: notification.relatedEntityTag,
      readAt: notification.readAt,
      timestamp: notification.createdAt,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function markAsRead(req: AuthedRequest, res: Response) {
  const { eventId } = req.params;
  const notification = await prisma.notification.findUnique({ where: { id: eventId } });
  if (!notification) {
    return res.status(404).json({ error: "notification_not_found" });
  }

  const updated = await prisma.notification.update({
    where: { id: eventId },
    data: { readAt: new Date() },
  });

  res.json({ eventId: updated.id, readAt: updated.readAt });
}
