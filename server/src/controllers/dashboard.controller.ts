import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getOverview(_req: AuthedRequest, res: Response) {
  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const upcomingWindowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const [
    available,
    allocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    availableForReturn,
    upcomingReturns,
  ] = await Promise.all([
    prisma.asset.count({ where: { status: "available" } }),
    prisma.asset.count({ where: { status: "allocated" } }),
    prisma.asset.count({ where: { status: "under_maintenance" } }),
    prisma.booking.count({ where: { status: "confirmed", date: { gte: todayStart, lte: todayEnd } } }),
    prisma.transferRequest.count({ where: { status: "pending_approval" } }),
    prisma.allocation.count({
      where: { returnedAt: null, expectedReturnDate: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.allocation.count({
      where: { returnedAt: null, expectedReturnDate: { gt: todayEnd, lte: upcomingWindowEnd } },
    }),
  ]);

  res.json({
    available,
    allocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    availableForReturn,
    upcomingReturns,
  });
}

export async function getAlerts(_req: AuthedRequest, res: Response) {
  const now = new Date();
  const overdue = await prisma.allocation.findMany({
    where: { returnedAt: null, expectedReturnDate: { lt: now } },
    include: { asset: true },
    orderBy: { expectedReturnDate: "asc" },
  });

  res.json({
    overdueReturns: overdue.map((allocation) => ({
      assetTag: allocation.asset.tag,
      daysOverdue: Math.floor(
        (now.getTime() - allocation.expectedReturnDate!.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
  });
}

export async function getRecentActivity(req: AuthedRequest, res: Response) {
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? "10", 10) || 10));

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json(
    notifications.map((notification) => ({
      eventId: notification.id,
      type: notification.type,
      message: notification.message,
      relatedEntityTag: notification.relatedEntityTag,
      timestamp: notification.createdAt,
    }))
  );
}
