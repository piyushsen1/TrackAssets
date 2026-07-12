import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

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
    holder: allocation
      ? { employeeId: allocation.employeeId, name: allocation.employee.name }
      : null,
  });
}

export async function createAllocation(req: AuthedRequest, res: Response) {
  const { tag, employeeId } = req.body ?? {};
  if (!tag || !employeeId) {
    return res
      .status(400)
      .json({ error: "missing_fields", required: ["tag", "employeeId"] });
  }

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
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
      currentHolder: {
        employeeId: current.employeeId,
        name: current.employee.name,
      },
    });
  }

  const allocation = await prisma.allocation.create({
    data: {
      assetId: asset.id,
      employeeId,
    },
    include: { employee: true },
  });

  res.status(201).json({
    allocationId: allocation.id,
    tag: asset.tag,
    employeeId: allocation.employeeId,
    employeeName: allocation.employee.name,
    allocatedSince: allocation.allocatedSince,
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

  const fromEmployee = await prisma.employee.findUnique({
    where: { id: fromEmployeeId },
  });
  const toEmployee = await prisma.employee.findUnique({
    where: { id: toEmployeeId },
  });
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
      message:
        "The fromEmployeeId does not match the current holder for this asset.",
    });
  }

  const request = await prisma.transferRequest.create({
    data: {
      assetId: asset.id,
      fromEmployeeId,
      toEmployeeId,
      reason: reason ?? "",
    },
  });

  res.status(201).json({ requestId: request.id, status: request.status });
}

export async function approveTransferRequest(
  req: AuthedRequest,
  res: Response,
) {
  const { requestId } = req.params;
  const request = await prisma.transferRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return res.status(404).json({ error: "request_not_found" });
  }
  if (request.status !== "pending_approval") {
    return res.status(400).json({ error: "invalid_request_status" });
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
      data: {
        assetId: request.assetId,
        employeeId: request.toEmployeeId,
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
  });
  if (!request) {
    return res.status(404).json({ error: "request_not_found" });
  }
  if (request.status !== "pending_approval") {
    return res.status(400).json({ error: "invalid_request_status" });
  }

  await prisma.transferRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      reason: request.reason ? request.reason : request.reason,
    },
  });

  res.json({ requestId, status: "rejected", reason: reason ?? request.reason });
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
      returnedAt: allocation.returnedAt,
    })),
  );
}
