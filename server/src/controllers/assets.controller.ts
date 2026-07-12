import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement against Asset model (Prisma); status must only change via
// allocation/maintenance/audit controllers, never a direct PATCH here.

export async function listAssets(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function registerAsset(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getAsset(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function updateAsset(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getAssetHistory(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
