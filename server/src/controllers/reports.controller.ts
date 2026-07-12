import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function utilizationByDepartment(
  _req: AuthedRequest,
  res: Response,
) {
  const assets = await prisma.asset.findMany({
    include: { department: true, allocations: { where: { returnedAt: null } } },
  });

  const summary = assets.reduce((acc, asset) => {
    const departmentName = asset.department?.name ?? "Unassigned";
    const entry = acc.get(departmentName) ?? {
      department: departmentName,
      total: 0,
      allocated: 0,
    };
    entry.total += 1;
    if (asset.allocations.length > 0) entry.allocated += 1;
    acc.set(departmentName, entry);
    return acc;
  }, new Map<string, { department: string; total: number; allocated: number }>());

  res.json(
    Array.from(summary.values()).map((row) => ({
      department: row.department,
      utilization:
        row.total === 0 ? 0 : Math.round((row.allocated / row.total) * 100),
    })),
  );
}

export async function maintenanceFrequency(_req: AuthedRequest, res: Response) {
  const tickets = await prisma.maintenanceTicket.findMany({
    orderBy: { createdAt: "asc" },
  });
  const frequency = tickets.reduce((acc, ticket) => {
    const date = ticket.createdAt;
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const entry = acc.get(label) ?? { label, count: 0 };
    entry.count += 1;
    acc.set(label, entry);
    return acc;
  }, new Map<string, { label: string; count: number }>());

  res.json(Array.from(frequency.values()));
}

export async function mostUsedAssets(_req: AuthedRequest, res: Response) {
  const counts = await prisma.allocation.groupBy({
    by: ["assetId"],
    _count: { assetId: true },
    orderBy: { _count: { assetId: "desc" } },
    take: 10,
  });

  const assetIds = counts.map((c) => c.assetId);
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
  });
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  res.json(
    counts.map((count) => ({
      tag: assetMap.get(count.assetId)?.tag ?? "unknown",
      name: assetMap.get(count.assetId)?.name ?? "unknown",
      count: count._count.assetId ?? 0,
    })),
  );
}

export async function idleAssets(_req: AuthedRequest, res: Response) {
  const threshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
  const assets = await prisma.asset.findMany({
    where: { status: "available", updatedAt: { lt: threshold } },
    include: { category: true, department: true },
  });

  res.json(
    assets.map((asset) => ({
      tag: asset.tag,
      name: asset.name,
      category: asset.category?.name ?? null,
      department: asset.department?.name ?? null,
      lastUpdated: asset.updatedAt,
    })),
  );
}

export async function dueForMaintenance(_req: AuthedRequest, res: Response) {
  const threshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);
  const assets = await prisma.asset.findMany({
    where: {
      OR: [
        { status: "under_maintenance" },
        { status: "allocated", updatedAt: { lt: threshold } },
      ],
    },
    include: { category: true, department: true },
  });

  res.json(
    assets.map((asset) => ({
      tag: asset.tag,
      name: asset.name,
      status: asset.status,
      department: asset.department?.name ?? null,
      category: asset.category?.name ?? null,
      updatedAt: asset.updatedAt,
    })),
  );
}

export async function exportReport(req: AuthedRequest, res: Response) {
  const { format } = req.query as { format?: string };
  if (!format) {
    return res
      .status(400)
      .json({ error: "missing_fields", required: ["format"] });
  }

  if (format !== "csv") {
    return res
      .status(501)
      .json({ error: "unsupported_format", supported: ["csv"] });
  }

  const assets = await prisma.asset.findMany({
    include: { category: true, department: true },
  });
  const rows = ["Tag,Name,Status,Department,Category"];
  for (const asset of assets) {
    rows.push(
      [
        asset.tag,
        asset.name,
        asset.status,
        asset.department?.name ?? "",
        asset.category?.name ?? "",
      ]
        .map((value) => String(value).replace(/"/g, '""'))
        .map((escaped) => `"${escaped}"`)
        .join(","),
    );
  }

  res.header("Content-Type", "text/csv");
  res.send(rows.join("\n"));
}
