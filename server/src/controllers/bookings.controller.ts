import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function listResources(_req: AuthedRequest, res: Response) {
  const resources = await prisma.resource.findMany({
    orderBy: { name: "asc" },
  });
  res.json(
    resources.map((resource) => ({
      resourceId: resource.id,
      name: resource.name,
      type: resource.type,
    })),
  );
}

export async function getResourceAvailability(
  req: AuthedRequest,
  res: Response,
) {
  const { resourceId } = req.params;
  const { date } = req.query as { date?: string };

  if (!date) {
    return res
      .status(400)
      .json({ error: "missing_fields", required: ["date"] });
  }

  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const bookings = await prisma.booking.findMany({
    where: {
      resourceId,
      startTime: { gte: startOfDay, lt: endOfDay },
    },
    orderBy: { startTime: "asc" },
  });

  res.json(
    bookings.map((booking) => ({
      bookingId: booking.id,
      requesterId: booking.requesterId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
    })),
  );
}

export async function createBooking(req: AuthedRequest, res: Response) {
  const { resourceId, date, startTime, endTime, requesterId } = req.body ?? {};
  if (!resourceId || !date || !startTime || !endTime || !requesterId) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["resourceId", "date", "startTime", "endTime", "requesterId"],
    });
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });
  if (!resource) {
    return res.status(404).json({ error: "resource_not_found" });
  }

  const requester = await prisma.employee.findUnique({
    where: { id: requesterId },
  });
  if (!requester) {
    return res.status(400).json({ error: "invalid_requester" });
  }

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (start >= end) {
    return res.status(400).json({ error: "invalid_time_range" });
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      resourceId,
      status: "confirmed",
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  });

  if (overlap) {
    return res.status(409).json({
      error: "conflict",
      conflictingBookingId: overlap.id,
    });
  }

  const booking = await prisma.booking.create({
    data: {
      resourceId,
      requesterId,
      date: new Date(`${date}T00:00:00.000Z`),
      startTime: start,
      endTime: end,
      status: "confirmed",
    },
  });

  res.status(201).json({
    bookingId: booking.id,
    resourceId: booking.resourceId,
    requesterId: booking.requesterId,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
  });
}

export async function cancelBooking(req: AuthedRequest, res: Response) {
  const { bookingId } = req.params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "booking_not_found" });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });

  res.status(204).send();
}
