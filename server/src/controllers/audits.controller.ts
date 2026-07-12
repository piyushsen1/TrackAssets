import { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import type { VerificationResult } from "@prisma/client";

const VALID_RESULTS: VerificationResult[] = ["verified", "missing", "damaged"];

export async function startAudit(req: AuthedRequest, res: Response) {
  const { department, dateRangeStart, dateRangeEnd, auditors } = req.body ?? {};
  if (!department || !dateRangeStart || !dateRangeEnd) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["department", "dateRangeStart", "dateRangeEnd"],
    });
  }

  const start = new Date(dateRangeStart);
  const end = new Date(dateRangeEnd);
  if (start >= end) {
    return res.status(400).json({ error: "invalid_date_range" });
  }

  const departmentEntry = await prisma.department.findUnique({ where: { id: department } });
  if (!departmentEntry) {
    return res.status(400).json({ error: "invalid_department" });
  }

  const auditorIds: string[] = Array.isArray(auditors) ? auditors : [];
  if (auditorIds.length > 0) {
    const foundAuditors = await prisma.employee.findMany({ where: { id: { in: auditorIds } } });
    if (foundAuditors.length !== auditorIds.length) {
      return res.status(400).json({ error: "invalid_auditor" });
    }
  }

  const assets = await prisma.asset.findMany({ where: { departmentId: department } });

  const audit = await prisma.$transaction(async (tx) => {
    const created = await tx.auditCycle.create({
      data: {
        departmentId: department,
        dateRangeStart: start,
        dateRangeEnd: end,
        auditors: auditorIds,
        status: "open",
      },
    });

    if (assets.length > 0) {
      await tx.auditLineItem.createMany({
        data: assets.map((asset) => ({
          auditId: created.id,
          assetId: asset.id,
          expectedLocation: asset.location ?? "Unknown",
        })),
      });
    }

    return created;
  });

  res.status(201).json({
    auditId: audit.id,
    department: departmentEntry.name,
    dateRangeStart: audit.dateRangeStart,
    dateRangeEnd: audit.dateRangeEnd,
    auditors: audit.auditors,
    status: audit.status,
    lineItems: assets.map((asset) => ({ tag: asset.tag, expectedLocation: asset.location ?? "Unknown" })),
  });
}

export async function listAudits(req: AuthedRequest, res: Response) {
  const { status, department } = req.query as { status?: string; department?: string };

  const audits = await prisma.auditCycle.findMany({
    where: {
      ...(status && { status: status as Prisma.AuditCycleWhereInput["status"] }),
      ...(department && { departmentId: department }),
    },
    include: { department: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    audits.map((audit) => {
      const discrepancyCount = audit.lineItems.filter(
        (item) => item.result === "missing" || item.result === "damaged"
      ).length;
      const verifiedCount = audit.lineItems.filter((item) => item.result === "verified").length;
      return {
        auditId: audit.id,
        departmentId: audit.departmentId,
        department: audit.department.name,
        dateRangeStart: audit.dateRangeStart,
        dateRangeEnd: audit.dateRangeEnd,
        auditors: audit.auditors,
        status: audit.status,
        totalLineItems: audit.lineItems.length,
        verifiedCount,
        discrepancyCount,
      };
    })
  );
}

export async function getAuditDetail(req: AuthedRequest, res: Response) {
  const { auditId } = req.params;

  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    include: { department: true, lineItems: { include: { asset: true } } },
  });
  if (!audit) {
    return res.status(404).json({ error: "audit_not_found" });
  }

  res.json({
    auditId: audit.id,
    departmentId: audit.departmentId,
    department: audit.department.name,
    dateRangeStart: audit.dateRangeStart,
    dateRangeEnd: audit.dateRangeEnd,
    auditors: audit.auditors,
    status: audit.status,
    lineItems: audit.lineItems.map((item) => ({
      tag: item.asset.tag,
      expectedLocation: item.expectedLocation,
      result: item.result,
      notes: item.notes,
    })),
  });
}

export async function updateLineItem(req: AuthedRequest, res: Response) {
  const { auditId, tag } = req.params;
  const { verification, notes } = req.body ?? {};
  if (!verification || !VALID_RESULTS.includes(verification)) {
    return res.status(400).json({ error: "invalid_verification", allowed: VALID_RESULTS });
  }

  const audit = await prisma.auditCycle.findUnique({ where: { id: auditId } });
  if (!audit) {
    return res.status(404).json({ error: "audit_not_found" });
  }
  if (audit.status === "closed") {
    return res.status(400).json({ error: "audit_closed" });
  }

  const isAssignedAuditor = !!req.user?.employeeId && audit.auditors.includes(req.user.employeeId);
  if (req.user?.role !== "admin" && !isAssignedAuditor) {
    return res.status(403).json({
      error: "not_assigned_auditor",
      message: "Only auditors assigned to this cycle (or an admin) may record verification results.",
    });
  }

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const lineItem = await prisma.auditLineItem.findFirst({
    where: { auditId, assetId: asset.id },
  });
  if (!lineItem) {
    return res.status(404).json({ error: "line_item_not_found" });
  }

  const updated = await prisma.auditLineItem.update({
    where: { id: lineItem.id },
    data: {
      result: verification,
      notes: notes ?? lineItem.notes,
    },
  });

  res.json({ lineItemId: updated.id, tag, result: updated.result, notes: updated.notes });
}

export async function getDiscrepancies(req: AuthedRequest, res: Response) {
  const { auditId } = req.params;
  const items = await prisma.auditLineItem.findMany({
    where: { auditId, result: { in: ["missing", "damaged"] } },
    include: { asset: true },
  });

  res.json(
    items.map((item) => ({
      id: item.id,
      tag: item.asset.tag,
      result: item.result,
      expectedLocation: item.expectedLocation,
      notes: item.notes,
    }))
  );
}

export async function closeAudit(req: AuthedRequest, res: Response) {
  const { auditId } = req.params;
  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    include: { lineItems: { include: { asset: true } } },
  });
  if (!audit) {
    return res.status(404).json({ error: "audit_not_found" });
  }
  if (audit.status === "closed") {
    return res.status(400).json({ error: "audit_already_closed" });
  }

  const issues = audit.lineItems.filter((item) => item.result === "missing" || item.result === "damaged");

  await prisma.$transaction(async (tx) => {
    await tx.auditCycle.update({ where: { id: auditId }, data: { status: "closed" } });

    for (const item of issues) {
      await tx.notification.create({
        data: {
          type: "audit",
          message: `Audit ${audit.id}: ${item.asset.tag} flagged ${item.result}`,
          relatedEntityTag: item.asset.tag,
        },
      });

      if (item.result === "missing") {
        await tx.asset.update({ where: { id: item.assetId }, data: { status: "lost" } });
      }

      if (item.result === "damaged") {
        // Only creates the ticket in `pending` — asset status only moves to
        // under_maintenance through the normal maintenance approval workflow,
        // not as a direct side effect of closing the audit.
        await tx.maintenanceTicket.create({
          data: {
            assetId: item.assetId,
            issueDescription: `Audit cycle ${audit.id} flagged ${item.asset.tag} as damaged`,
            raisedBy: `Audit Cycle ${audit.id}`,
            priority: "high",
            status: "pending",
          },
        });
      }
    }
  });

  res.json({ auditId, closed: true, discrepancies: issues.length });
}
