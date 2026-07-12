import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement double-allocation block: POST /allocations must 409 with
// { error: "already_allocated", currentHolder } if the asset is already assigned.

export async function getCurrentAllocation(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createAllocation(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createTransferRequest(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function approveTransferRequest(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function rejectTransferRequest(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getAllocationHistory(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
