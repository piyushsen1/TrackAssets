import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "admin_only" });
  }
  next();
}
