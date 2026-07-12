import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement against Resource/Booking models; POST /bookings must 409
// with { error: "conflict", conflictingBookingId } on overlapping time slots.

export async function listResources(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function getResourceAvailability(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createBooking(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function cancelBooking(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
