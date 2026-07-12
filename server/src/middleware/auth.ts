import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "employee" | "department_head" | "asset_manager" | "admin";

export interface AuthUser {
  userId: string;
  employeeId?: string;
  role: UserRole;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = jwt.verify(token, env.jwtSecret) as unknown as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
