import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const VALID_PRIORITIES: TicketPriority[] = ["low", "medium", "high"];

export async function listTickets(req: AuthedRequest, res: Response) {
  const status = req.query.status as TicketStatus | undefined;
  const where = status ? { status } : undefined;
  const tickets = await prisma.maintenanceTicket.findMany({
    where,
    include: { asset: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    tickets.map((ticket) => ({
      ticketId: ticket.id,
      tag: ticket.asset.tag,
      issueDescription: ticket.issueDescription,
      priority: ticket.priority,
      photoUrl: ticket.photoUrl,
      status: ticket.status,
      technicianName: ticket.technicianName,
      raisedBy: ticket.raisedBy,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }))
  );
}

export async function raiseTicket(req: AuthedRequest, res: Response) {
  const { tag, issueDescription, raisedBy, priority, photoUrl } = req.body ?? {};
  if (!tag || !issueDescription || !raisedBy) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["tag", "issueDescription", "raisedBy"],
    });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "invalid_priority", allowed: VALID_PRIORITIES });
  }

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      assetId: asset.id,
      issueDescription,
      raisedBy,
      priority: priority ?? "medium",
      photoUrl: photoUrl ?? null,
      status: "pending",
    },
  });

  res.status(201).json({
    ticketId: ticket.id,
    tag: asset.tag,
    issueDescription: ticket.issueDescription,
    priority: ticket.priority,
    status: ticket.status,
  });
}

async function requireTicketInStatus(ticketId: string, expected: TicketStatus) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: { asset: true },
  });
  if (!ticket) return { error: "ticket_not_found" as const };
  if (ticket.status !== expected) return { error: "invalid_ticket_status" as const, ticket };
  return { ticket };
}

export async function approveTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const result = await requireTicketInStatus(ticketId, "pending");
  if (result.error === "ticket_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "invalid_ticket_status")
    return res.status(400).json({ error: result.error });
  const { ticket } = result;

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceTicket.update({ where: { id: ticketId }, data: { status: "approved" } });
    await tx.asset.update({ where: { id: ticket.assetId }, data: { status: "under_maintenance" } });
    await tx.notification.create({
      data: {
        type: "approval",
        message: `Maintenance ticket ${ticket.id} approved for asset ${ticket.asset.tag}`,
        relatedEntityTag: ticket.asset.tag,
      },
    });
  });

  res.json({ ticketId, status: "approved" });
}

export async function rejectTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const { reason } = req.body ?? {};
  const result = await requireTicketInStatus(ticketId, "pending");
  if (result.error === "ticket_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "invalid_ticket_status")
    return res.status(400).json({ error: result.error });
  const { ticket } = result;

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: { status: "rejected", rejectionReason: reason ?? null },
    });
    await tx.notification.create({
      data: {
        type: "approval",
        message: `Maintenance ticket ${ticket.id} rejected for asset ${ticket.asset.tag}`,
        relatedEntityTag: ticket.asset.tag,
      },
    });
  });

  res.json({ ticketId, status: "rejected", rejectionReason: reason ?? null });
}

export async function assignTechnician(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const { technicianName } = req.body ?? {};
  if (!technicianName) {
    return res.status(400).json({ error: "missing_fields", required: ["technicianName"] });
  }

  const result = await requireTicketInStatus(ticketId, "approved");
  if (result.error === "ticket_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "invalid_ticket_status")
    return res.status(400).json({ error: result.error });
  const { ticket } = result;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: { technicianName, status: "technician_assigned" },
    });
    await tx.notification.create({
      data: {
        type: "approval",
        message: `Technician ${technicianName} assigned to ticket ${ticket.id} (asset ${ticket.asset.tag})`,
        relatedEntityTag: ticket.asset.tag,
      },
    });
    return result;
  });

  res.json({ ticketId: updated.id, status: updated.status, technicianName: updated.technicianName });
}

export async function startTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const result = await requireTicketInStatus(ticketId, "technician_assigned");
  if (result.error === "ticket_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "invalid_ticket_status")
    return res.status(400).json({ error: result.error });
  const { ticket } = result;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: { status: "in_progress" },
    });
    await tx.notification.create({
      data: {
        type: "approval",
        message: `Maintenance started on ticket ${ticket.id} (asset ${ticket.asset.tag})`,
        relatedEntityTag: ticket.asset.tag,
      },
    });
    return result;
  });

  res.json({ ticketId: updated.id, status: updated.status });
}

export async function resolveTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const { resolutionNotes } = req.body ?? {};
  const result = await requireTicketInStatus(ticketId, "in_progress");
  if (result.error === "ticket_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "invalid_ticket_status")
    return res.status(400).json({ error: result.error });
  const { ticket } = result;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTicket = await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: { status: "resolved", resolutionNotes: resolutionNotes ?? null },
    });

    // Maintenance and allocation are independent axes — if the holder never returned
    // the asset while it was under maintenance, resolving the ticket must restore
    // `allocated`, not blindly `available` (which would silently contradict the still-open
    // Allocation row and corrupt Dashboard/Reports counts + the Asset Directory's status).
    const openAllocation = await tx.allocation.findFirst({
      where: { assetId: ticket.assetId, returnedAt: null },
    });
    const restoredStatus = openAllocation ? "allocated" : "available";
    await tx.asset.update({ where: { id: ticket.assetId }, data: { status: restoredStatus } });

    await tx.notification.create({
      data: {
        type: "approval",
        message: `Maintenance resolved for ticket ${ticket.id}, asset ${ticket.asset.tag} is ${restoredStatus} again`,
        relatedEntityTag: ticket.asset.tag,
      },
    });
    return updatedTicket;
  });

  res.json({ ticketId: updated.id, status: updated.status, resolutionNotes: updated.resolutionNotes });
}
