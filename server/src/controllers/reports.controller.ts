import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: read-only aggregation across Asset, Booking, MaintenanceTicket models;
// no data owned here.

export async function utilizationByDepartment(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function maintenanceFrequency(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function mostUsedAssets(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function idleAssets(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function dueForMaintenance(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function exportReport(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
