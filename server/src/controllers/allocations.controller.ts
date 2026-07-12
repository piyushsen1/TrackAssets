import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";

function isOverdue(expectedReturnDate: Date | null, returnedAt: Date | null) {
  return !!expectedReturnDate && !returnedAt && expectedReturnDate.getTime() < Date.now();
}

export async function getCurrentAllocation(req: AuthedRequest, res: Response) {
  const { tag } = req.params;
  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const allocation = await prisma.allocation.findFirst({
    where: { assetId: asset.id, returnedAt: null },
    include: { employee: true },
  });

  res.json({
    tag: asset.tag,
    holder: allocation
      ? {
          allocationId: allocation.id,
          employeeId: allocation.employeeId,
          name: allocation.employee.name,
          allocatedSince: allocation.allocatedSince,
          expectedReturnDate: allocation.expectedReturnDate,
          isOverdue: isOverdue(allocation.expectedReturnDate, allocation.returnedAt),
        }
      : null,
  });
}

export async function createAllocation(req: AuthedRequest, res: Response) {
  const { tag, employeeId, expectedReturnDate } = req.body ?? {};
  if (!tag || !employeeId) {
    return res.status(400).json({ error: "missing_fields", required: ["tag", "employeeId"] });
  }

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return res.status(400).json({ error: "invalid_employee" });
  }

  const current = await prisma.allocation.findFirst({
    where: { assetId: asset.id, returnedAt: null },
    include: { employee: true },
  });
  if (current) {
    return res.status(409).json({
      error: "already_allocated",
      currentHolder: { employeeId: current.employeeId, name: current.employee.name },
    });
  }

  if (asset.status !== "available") {
    return res.status(400).json({ error: "asset_not_available", status: asset.status });
  }

  const allocation = await prisma.$transaction(async (tx) => {
    const created = await tx.allocation.create({
      data: {
        assetId: asset.id,
        employeeId,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
      },
      include: { employee: true },
    });
    await tx.asset.update({ where: { id: asset.id }, data: { status: "allocated" } });
    await tx.notification.create({
      data: {
        type: "allocation",
        message: `Asset ${asset.tag} allocated to ${created.employee.name}`,
        relatedEntityTag: asset.tag,
      },
    });
    return created;
  });

  res.status(201).json({
    allocationId: allocation.id,
    tag: asset.tag,
    employeeId: allocation.employeeId,
    employeeName: allocation.employee.name,
    allocatedSince: allocation.allocatedSince,
    expectedReturnDate: allocation.expectedReturnDate,
  });
}

export async function returnAllocation(req: AuthedRequest, res: Response) {
  const { allocationId } = req.params;
  const { conditionNotes } = req.body ?? {};

  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    include: { asset: true, employee: true },
  });
  if (!allocation) {
    return res.status(404).json({ error: "allocation_not_found" });
  }
  if (allocation.returnedAt) {
    return res.status(400).json({ error: "already_returned" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const returned = await tx.allocation.update({
      where: { id: allocationId },
      data: { returnedAt: new Date(), conditionOnReturn: conditionNotes ?? null },
    });
    await tx.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: "available",
        ...(conditionNotes && { condition: conditionNotes }),
      },
    });
    await tx.notification.create({
      data: {
        type: "allocation",
        message: `Asset ${allocation.asset.tag} returned by ${allocation.employee.name}`,
        relatedEntityTag: allocation.asset.tag,
      },
    });
    return returned;
  });

  res.json({
    allocationId: updated.id,
    tag: allocation.asset.tag,
    returnedAt: updated.returnedAt,
    conditionOnReturn: updated.conditionOnReturn,
  });
}

export async function createTransferRequest(req: AuthedRequest, res: Response) {
  const { tag, fromEmployeeId, toEmployeeId, reason } = req.body ?? {};
  if (!tag || !fromEmployeeId || !toEmployeeId) {
    return res.status(400).json({
      error: "missing_fields",
      required: ["tag", "fromEmployeeId", "toEmployeeId"],
    });
  }

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const fromEmployee = await prisma.employee.findUnique({ where: { id: fromEmployeeId } });
  const toEmployee = await prisma.employee.findUnique({ where: { id: toEmployeeId } });
  if (!fromEmployee || !toEmployee) {
    return res.status(400).json({ error: "invalid_employee" });
  }

  const currentAllocation = await prisma.allocation.findFirst({
    where: { assetId: asset.id, returnedAt: null },
  });

  if (!currentAllocation) {
    return res.status(400).json({ error: "asset_not_allocated" });
  }

  if (currentAllocation.employeeId !== fromEmployeeId) {
    return res.status(400).json({
      error: "invalid_from_employee",
      message: "The fromEmployeeId does not match the current holder for this asset.",
    });
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.transferRequest.create({
      data: { assetId: asset.id, fromEmployeeId, toEmployeeId, reason: reason ?? "" },
    });
    await tx.notification.create({
      data: {
        type: "transfer",
        message: `Transfer requested for asset ${asset.tag}: ${fromEmployee.name} -> ${toEmployee.name}`,
        relatedEntityTag: asset.tag,
      },
    });
    return created;
  });

  res.status(201).json({ requestId: request.id, status: request.status });
}

export async function approveTransferRequest(req: AuthedRequest, res: Response) {
  const { requestId } = req.params;
  const request = await prisma.transferRequest.findUnique({
    where: { id: requestId },
    include: { asset: true, fromEmployee: true, toEmployee: true },
  });

  if (!request) {
    return res.status(404).json({ error: "request_not_found" });
  }
  if (request.status !== "pending_approval") {
    return res.status(400).json({ error: "invalid_request_status" });
  }

  if (req.user?.role === "department_head") {
    const approver = req.user.employeeId
      ? await prisma.employee.findUnique({ where: { id: req.user.employeeId } })
      : null;
    if (!approver || approver.departmentId !== request.fromEmployee.departmentId) {
      return res.status(403).json({
        error: "outside_department",
        message: "Department Heads may only approve transfers within their own department.",
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    const currentAllocation = await tx.allocation.findFirst({
      where: { assetId: request.assetId, returnedAt: null },
    });
    if (currentAllocation) {
      await tx.allocation.update({
        where: { id: currentAllocation.id },
        data: { returnedAt: new Date() },
      });
    }

    await tx.transferRequest.update({
      where: { id: requestId },
      data: { status: "approved" },
    });

    await tx.allocation.create({
      data: { assetId: request.assetId, employeeId: request.toEmployeeId },
    });

    await tx.notification.create({
      data: {
        type: "transfer",
        message: `Transfer approved for asset ${request.asset.tag}: now held by ${request.toEmployee.name}`,
        relatedEntityTag: request.asset.tag,
      },
    });
  });

  res.json({ requestId, status: "approved" });
}

export async function rejectTransferRequest(req: AuthedRequest, res: Response) {
  const { requestId } = req.params;
  const { reason } = req.body ?? {};

  const request = await prisma.transferRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!request) {
    return res.status(404).json({ error: "request_not_found" });
  }
  if (request.status !== "pending_approval") {
    return res.status(400).json({ error: "invalid_request_status" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transferRequest.update({
      where: { id: requestId },
      data: { status: "rejected", rejectionReason: reason ?? null },
    });
    await tx.notification.create({
      data: {
        type: "transfer",
        message: `Transfer rejected for asset ${request.asset.tag}`,
        relatedEntityTag: request.asset.tag,
      },
    });
  });

  res.json({ requestId, status: "rejected", rejectionReason: reason ?? null });
}

export async function getAllocationHistory(req: AuthedRequest, res: Response) {
  const { tag } = req.params;
  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const allocations = await prisma.allocation.findMany({
    where: { assetId: asset.id },
    include: { employee: true },
    orderBy: { allocatedSince: "desc" },
  });

  res.json(
    allocations.map((allocation) => ({
      allocationId: allocation.id,
      employeeId: allocation.employeeId,
      employeeName: allocation.employee.name,
      allocatedSince: allocation.allocatedSince,
      expectedReturnDate: allocation.expectedReturnDate,
      returnedAt: allocation.returnedAt,
      conditionOnReturn: allocation.conditionOnReturn,
      isOverdue: isOverdue(allocation.expectedReturnDate, allocation.returnedAt),
    }))
  );
}
