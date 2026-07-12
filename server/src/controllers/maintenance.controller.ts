import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";
import type { TicketStatus } from "@prisma/client";

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
      status: ticket.status,
      technicianName: ticket.technicianName,
      raisedBy: ticket.raisedBy,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })),
  );
}

export async function raiseTicket(req: AuthedRequest, res: Response) {
  const { tag, issueDescription, raisedBy } = req.body ?? {};
  if (!tag || !issueDescription || !raisedBy) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["tag", "issueDescription", "raisedBy"],
    });
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
      status: "pending",
    },
  });

  res.status(201).json({
    ticketId: ticket.id,
    tag: asset.tag,
    issueDescription: ticket.issueDescription,
    status: ticket.status,
  });
}

export async function approveTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: { asset: true },
  });
  if (!ticket) {
    return res.status(404).json({ error: "ticket_not_found" });
  }
  if (ticket.status !== "pending") {
    return res.status(400).json({ error: "invalid_ticket_status" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: { status: "approved" },
    });
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: "under_maintenance" },
    });
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

export async function assignTechnician(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const { technicianName } = req.body ?? {};
  if (!technicianName) {
    return res
      .status(400)
      .json({ error: "missing_fields", required: ["technicianName"] });
  }

  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: { technicianName, status: "technician_assigned" },
  });

  res.json({
    ticketId: ticket.id,
    status: ticket.status,
    technicianName: ticket.technicianName,
  });
}

export async function startTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) {
    return res.status(404).json({ error: "ticket_not_found" });
  }
  if (ticket.status === "resolved") {
    return res.status(400).json({ error: "invalid_ticket_status" });
  }

  const updated = await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: { status: "in_progress" },
  });

  res.json({ ticketId: updated.id, status: updated.status });
}

export async function resolveTicket(req: AuthedRequest, res: Response) {
  const { ticketId } = req.params;
  const { resolutionNotes } = req.body ?? {};
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: { asset: true },
  });
  if (!ticket) {
    return res.status(404).json({ error: "ticket_not_found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTicket = await tx.maintenanceTicket.update({
      where: { id: ticketId },
      data: {
        status: "resolved",
        resolutionNotes: resolutionNotes ?? ticket.resolutionNotes,
      },
    });
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: "available" },
    });
    return updatedTicket;
  });

  res.json({
    ticketId: updated.id,
    status: updated.status,
    resolutionNotes: updated.resolutionNotes,
  });
}
