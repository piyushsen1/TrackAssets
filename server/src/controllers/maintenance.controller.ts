import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement Kanban state machine (pending -> approved -> technician_assigned
// -> in_progress -> resolved); approve/resolve must cascade the linked Asset's status.

export async function listTickets(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function raiseTicket(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function approveTicket(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function assignTechnician(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function startTicket(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function resolveTicket(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
