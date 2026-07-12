import { Response } from "express";
import { Booking } from "@prisma/client";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

function displayStatus(booking: Pick<Booking, "status" | "startTime" | "endTime">) {
  if (booking.status === "cancelled") return "cancelled";
  const now = Date.now();
  if (now < booking.startTime.getTime()) return "upcoming";
  if (now > booking.endTime.getTime()) return "completed";
  return "ongoing";
}

export async function listResources(_req: AuthedRequest, res: Response) {
  const resources = await prisma.resource.findMany({ orderBy: { name: "asc" } });
  res.json(resources.map((r) => ({ resourceId: r.id, name: r.name, type: r.type })));
}

export async function createResource(req: AuthedRequest, res: Response) {
  const { name, type } = req.body ?? {};
  if (!name || !type) {
    return res.status(400).json({ error: "missing_fields", required: ["name", "type"] });
  }

  const resource = await prisma.resource.create({ data: { name, type } });
  res.status(201).json({ resourceId: resource.id, name: resource.name, type: resource.type });
}

export async function getResourceAvailability(req: AuthedRequest, res: Response) {
  const { resourceId } = req.params;
  const { date } = req.query as { date?: string };

  if (!date) {
    return res.status(400).json({ error: "missing_fields", required: ["date"] });
  }

  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const bookings = await prisma.booking.findMany({
    where: { resourceId, startTime: { gte: startOfDay, lt: endOfDay } },
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
      displayStatus: displayStatus(booking),
    }))
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

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    return res.status(404).json({ error: "resource_not_found" });
  }

  const requester = await prisma.employee.findUnique({ where: { id: requesterId } });
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
    return res.status(409).json({ error: "conflict", conflictingBookingId: overlap.id });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        resourceId,
        requesterId,
        date: new Date(`${date}T00:00:00.000Z`),
        startTime: start,
        endTime: end,
        status: "confirmed",
      },
    });
    await tx.notification.create({
      data: {
        type: "booking",
        message: `${resource.name} booked by ${requester.name} for ${date} ${startTime}-${endTime}`,
        relatedEntityTag: null,
      },
    });
    return created;
  });

  res.status(201).json({
    bookingId: booking.id,
    resourceId: booking.resourceId,
    requesterId: booking.requesterId,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    displayStatus: displayStatus(booking),
  });
}

function canModifyBooking(req: AuthedRequest, booking: Booking) {
  return req.user?.role === "admin" || req.user?.employeeId === booking.requesterId;
}

export async function rescheduleBooking(req: AuthedRequest, res: Response) {
  const { bookingId } = req.params;
  const { date, startTime, endTime } = req.body ?? {};

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "booking_not_found" });
  }
  if (!canModifyBooking(req, booking)) {
    return res.status(403).json({ error: "not_booking_owner" });
  }
  if (booking.status === "cancelled") {
    return res.status(400).json({ error: "booking_cancelled" });
  }

  const newDateStr = date ?? booking.date.toISOString().slice(0, 10);
  const newStart = startTime ? new Date(`${newDateStr}T${startTime}`) : booking.startTime;
  const newEnd = endTime ? new Date(`${newDateStr}T${endTime}`) : booking.endTime;
  if (newStart >= newEnd) {
    return res.status(400).json({ error: "invalid_time_range" });
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      resourceId: booking.resourceId,
      status: "confirmed",
      id: { not: bookingId },
      AND: [{ startTime: { lt: newEnd } }, { endTime: { gt: newStart } }],
    },
  });
  if (overlap) {
    return res.status(409).json({ error: "conflict", conflictingBookingId: overlap.id });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: bookingId },
      data: { date: new Date(`${newDateStr}T00:00:00.000Z`), startTime: newStart, endTime: newEnd },
    });
    await tx.notification.create({
      data: { type: "booking", message: `Booking ${bookingId} rescheduled`, relatedEntityTag: null },
    });
    return result;
  });

  res.json({
    bookingId: updated.id,
    date: updated.date,
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    displayStatus: displayStatus(updated),
  });
}

export async function cancelBooking(req: AuthedRequest, res: Response) {
  const { bookingId } = req.params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "booking_not_found" });
  }
  if (!canModifyBooking(req, booking)) {
    return res.status(403).json({ error: "not_booking_owner" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
    await tx.notification.create({
      data: { type: "booking", message: `Booking ${bookingId} cancelled`, relatedEntityTag: null },
    });
  });

  res.status(204).send();
}
