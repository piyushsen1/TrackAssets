import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement against Notification model; emit() is called internally by
// other controllers (allocation, maintenance, booking, audit), not exposed directly.

export async function listNotifications(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function markAsRead(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
