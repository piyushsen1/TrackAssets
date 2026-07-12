import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: aggregate from Asset, Allocation, Booking, MaintenanceTicket, Notification models

export async function getOverview(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getAlerts(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getRecentActivity(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
