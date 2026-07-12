import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement against AuditCycle/AuditLineItem models; closing an audit
// should auto-create a Maintenance ticket for "damaged" and a Notification for "missing".

export async function startAudit(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function updateLineItem(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getDiscrepancies(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function closeAudit(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
