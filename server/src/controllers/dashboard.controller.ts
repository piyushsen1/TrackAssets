import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function getOverview(_req: AuthedRequest, res: Response) {
  const [
    totalAssets,
    openAudits,
    openTickets,
    pendingTransfers,
    unreadNotifications,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.auditCycle.count({ where: { status: "open" } }),
    prisma.maintenanceTicket.count({ where: { status: { not: "resolved" } } }),
    prisma.transferRequest.count({ where: { status: "pending_approval" } }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  res.json({
    totalAssets,
    openAudits,
    openTickets,
    pendingTransfers,
    unreadNotifications,
  });
}

export async function getAlerts(_req: AuthedRequest, res: Response) {
  const alerts = await prisma.notification.findMany({
    where: { type: "alert" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  res.json(
    alerts.map((notification) => ({
      eventId: notification.id,
      type: notification.type,
      message: notification.message,
      relatedEntityTag: notification.relatedEntityTag,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })),
  );
}

export async function getRecentActivity(_req: AuthedRequest, res: Response) {
  const [notifications, tickets] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.maintenanceTicket.findMany({
      include: { asset: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const activity = [
    ...notifications.map((notification) => ({
      type: "notification" as const,
      id: notification.id,
      message: notification.message,
      relatedTag: notification.relatedEntityTag,
      timestamp: notification.createdAt,
    })),
    ...tickets.map((ticket) => ({
      type: "maintenance" as const,
      id: ticket.id,
      message: `Ticket ${ticket.id} for ${ticket.asset.tag} moved to ${ticket.status}`,
      relatedTag: ticket.asset.tag,
      timestamp: ticket.updatedAt,
    })),
  ];

  activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  res.json(activity.slice(0, 15));
}
