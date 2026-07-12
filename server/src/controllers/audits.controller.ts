import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function startAudit(req: AuthedRequest, res: Response) {
  const { department, dateRangeStart, dateRangeEnd, auditors } = req.body ?? {};
  if (!department || !dateRangeStart || !dateRangeEnd) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["department", "dateRangeStart", "dateRangeEnd"],
    });
  }

  const departmentEntry = await prisma.department.findUnique({
    where: { id: department },
  });
  if (!departmentEntry) {
    return res.status(400).json({ error: "invalid_department" });
  }

  const audit = await prisma.auditCycle.create({
    data: {
      departmentId: department,
      dateRangeStart: new Date(dateRangeStart),
      dateRangeEnd: new Date(dateRangeEnd),
      auditors: Array.isArray(auditors) ? auditors : [],
      status: "open",
    },
  });

  const assets = await prisma.asset.findMany({
    where: { departmentId: department },
  });

  if (assets.length > 0) {
    await prisma.auditLineItem.createMany({
      data: assets.map((asset) => ({
        auditId: audit.id,
        assetId: asset.id,
        expectedLocation: asset.location ?? "Unknown",
      })),
    });
  }

  res.status(201).json({
    auditId: audit.id,
    department: departmentEntry.name,
    status: audit.status,
    lineItemsCreated: assets.length,
  });
}

export async function updateLineItem(req: AuthedRequest, res: Response) {
  const { auditId, tag } = req.params;
  const { verification, notes } = req.body ?? {};
  if (!verification) {
    return res
      .status(400)
      .json({ error: "missing_fields", required: ["verification"] });
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

  res.json({
    lineItemId: updated.id,
    result: updated.result,
    notes: updated.notes,
  });
}

export async function getDiscrepancies(req: AuthedRequest, res: Response) {
  const { auditId } = req.params;
  const items = await prisma.auditLineItem.findMany({
    where: {
      auditId,
      result: { not: "verified" },
    },
    include: { asset: true },
  });

  res.json(
    items.map((item) => ({
      id: item.id,
      tag: item.asset.tag,
      result: item.result,
      expectedLocation: item.expectedLocation,
      notes: item.notes,
    })),
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

  const issues = audit.lineItems.filter(
    (item) => item.result && item.result !== "verified",
  );

  await prisma.$transaction(async (tx) => {
    await tx.auditCycle.update({
      where: { id: auditId },
      data: { status: "closed" },
    });

    for (const item of issues) {
      await tx.notification.create({
        data: {
          type: "audit",
          message: `Audit ${audit.id}: ${item.asset.tag} marked ${item.result}`,
          relatedEntityTag: item.asset.tag,
        },
      });

      if (item.result === "damaged") {
        await tx.maintenanceTicket.create({
          data: {
            assetId: item.assetId,
            issueDescription: `Audit flagged ${item.asset.tag} as damaged`,
            raisedBy: "audit",
            status: "pending",
          },
        });
        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: "under_maintenance" },
        });
      }
    }
  });

  res.json({ auditId, closed: true, discrepancies: issues.length });
}
