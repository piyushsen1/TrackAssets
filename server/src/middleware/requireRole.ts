import { Response, NextFunction } from "express";
import { AuthedRequest, UserRole } from "./auth";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden", allowedRoles: roles });
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
