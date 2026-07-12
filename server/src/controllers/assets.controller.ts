import { Response } from "express";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";

const TAG_PREFIX = "AF-";
const TAG_PAD = 4;

async function generateNextTag(): Promise<string> {
  const [{ max }] = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(tag FROM ${TAG_PREFIX.length + 1}) AS INTEGER)) AS max
    FROM "Asset"
    WHERE tag LIKE ${TAG_PREFIX + "%"}
  `;
  return `${TAG_PREFIX}${String((max ?? 0) + 1).padStart(TAG_PAD, "0")}`;
}

type AssetWithRelations = Prisma.AssetGetPayload<{ include: { category: true; department: true } }>;

function toListItem(asset: AssetWithRelations) {
  return {
    tag: asset.tag,
    name: asset.name,
    category: asset.category?.name ?? null,
    status: asset.status,
    location: asset.location,
    departmentId: asset.departmentId,
    departmentName: asset.department?.name ?? null,
    isBookable: asset.isBookable,
  };
}

function toDetailResponse(asset: AssetWithRelations) {
  return {
    id: asset.id,
    tag: asset.tag,
    name: asset.name,
    categoryId: asset.categoryId,
    category: asset.category?.name ?? null,
    departmentId: asset.departmentId,
    department: asset.department?.name ?? null,
    location: asset.location,
    serial: asset.serial,
    qrCodeUrl: asset.qrCodeUrl,
    acquisitionDate: asset.acquisitionDate,
    acquisitionCost: asset.acquisitionCost,
    condition: asset.condition,
    photoUrl: asset.photoUrl,
    documentUrls: asset.documentUrls,
    isBookable: asset.isBookable,
    status: asset.status,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export async function listAssets(req: AuthedRequest, res: Response) {
  const { search, category, status, department, location } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? "20", 10) || 20));

  const where: Prisma.AssetWhereInput = {
    ...(category && { categoryId: category }),
    ...(status && { status: status as Prisma.EnumAssetStatusFilter["equals"] }),
    ...(department && { departmentId: department }),
    ...(location && { location: { contains: location, mode: "insensitive" } }),
    ...(search && {
      OR: [
        { tag: { contains: search, mode: "insensitive" } },
        { serial: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { category: true, department: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  res.json({
    items: items.map(toListItem),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function registerAsset(req: AuthedRequest, res: Response) {
  const {
    name,
    category,
    department,
    location,
    serial,
    acquisitionDate,
    acquisitionCost,
    condition,
    photoUrl,
    documentUrls,
    isBookable,
  } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: "missing_fields", required: ["name"] });
  }

  if (category) {
    const categoryExists = await prisma.category.findUnique({ where: { id: category } });
    if (!categoryExists) {
      return res.status(400).json({ error: "invalid_category" });
    }
  }
  if (department) {
    const departmentExists = await prisma.department.findUnique({ where: { id: department } });
    if (!departmentExists) {
      return res.status(400).json({ error: "invalid_department" });
    }
  }

  let asset: AssetWithRelations | undefined;
  let attempt = 0;
  while (!asset) {
    const tag = await generateNextTag();
    const qrCodeUrl = await QRCode.toDataURL(tag);
    try {
      asset = await prisma.asset.create({
        data: {
          tag,
          name,
          categoryId: category ?? null,
          departmentId: department ?? null,
          location: location ?? null,
          serial: serial ?? null,
          qrCodeUrl,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
          acquisitionCost: acquisitionCost ?? null,
          condition: condition ?? null,
          photoUrl: photoUrl ?? null,
          documentUrls: documentUrls ?? [],
          isBookable: !!isBookable,
        },
        include: { category: true, department: true },
      });
    } catch (err) {
      attempt += 1;
      const isTagCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isTagCollision || attempt >= 3) throw err;
    }
  }

  res.status(201).json({ tag: asset.tag, qrCodeUrl: asset.qrCodeUrl, status: asset.status });
}

export async function getAsset(req: AuthedRequest, res: Response) {
  const { tag } = req.params;

  const asset = await prisma.asset.findUnique({
    where: { tag },
    include: { category: true, department: true },
  });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const [currentAllocation, allocationHistory, maintenanceHistory] = await Promise.all([
    prisma.allocation.findFirst({
      where: { assetId: asset.id, returnedAt: null },
      include: { employee: true },
    }),
    prisma.allocation.findMany({
      where: { assetId: asset.id },
      include: { employee: true },
      orderBy: { allocatedSince: "desc" },
    }),
    prisma.maintenanceTicket.findMany({
      where: { assetId: asset.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  res.json({
    ...toDetailResponse(asset),
    currentHolder: currentAllocation
      ? { employeeId: currentAllocation.employeeId, name: currentAllocation.employee.name }
      : null,
    allocationHistory: allocationHistory.map((a) => ({
      employeeId: a.employeeId,
      employeeName: a.employee.name,
      allocatedSince: a.allocatedSince,
      returnedAt: a.returnedAt,
    })),
    maintenanceHistory: maintenanceHistory.map((m) => ({
      ticketId: m.id,
      issueDescription: m.issueDescription,
      status: m.status,
      technicianName: m.technicianName,
      createdAt: m.createdAt,
    })),
  });
}

const IMMUTABLE_FIELDS = ["status", "tag", "id"];

export async function updateAsset(req: AuthedRequest, res: Response) {
  const { tag } = req.params;
  const body = req.body ?? {};

  const attemptedImmutableField = IMMUTABLE_FIELDS.find((field) => field in body);
  if (attemptedImmutableField) {
    return res.status(400).json({
      error: "field_not_directly_editable",
      field: attemptedImmutableField,
      message: "Asset status changes only through allocation, maintenance, or audit actions.",
    });
  }

  const existing = await prisma.asset.findUnique({ where: { tag } });
  if (!existing) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const { name, category, department, location, serial, condition, photoUrl, documentUrls, isBookable, acquisitionDate, acquisitionCost } = body;

  const asset = await prisma.asset.update({
    where: { tag },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { categoryId: category }),
      ...(department !== undefined && { departmentId: department }),
      ...(location !== undefined && { location }),
      ...(serial !== undefined && { serial }),
      ...(condition !== undefined && { condition }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(documentUrls !== undefined && { documentUrls }),
      ...(isBookable !== undefined && { isBookable }),
      ...(acquisitionDate !== undefined && { acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null }),
      ...(acquisitionCost !== undefined && { acquisitionCost }),
    },
    include: { category: true, department: true },
  });

  res.json(toDetailResponse(asset));
}

export async function getAssetHistory(req: AuthedRequest, res: Response) {
  const { tag } = req.params;

  const asset = await prisma.asset.findUnique({ where: { tag } });
  if (!asset) {
    return res.status(404).json({ error: "asset_not_found" });
  }

  const [allocations, maintenanceTickets, auditLineItems] = await Promise.all([
    prisma.allocation.findMany({ where: { assetId: asset.id }, include: { employee: true } }),
    prisma.maintenanceTicket.findMany({ where: { assetId: asset.id } }),
    prisma.auditLineItem.findMany({ where: { assetId: asset.id } }),
  ]);

  const events = [
    ...allocations.flatMap((a) => [
      { type: "allocated" as const, date: a.allocatedSince, employeeId: a.employeeId, employeeName: a.employee.name },
      ...(a.returnedAt
        ? [{ type: "returned" as const, date: a.returnedAt, employeeId: a.employeeId, employeeName: a.employee.name }]
        : []),
    ]),
    ...maintenanceTickets.map((m) => ({
      type: "maintenance" as const,
      date: m.createdAt,
      status: m.status,
      issueDescription: m.issueDescription,
    })),
    ...auditLineItems.map((l) => ({
      type: "audit" as const,
      date: l.createdAt,
      result: l.result,
      notes: l.notes,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  res.json(events);
}
