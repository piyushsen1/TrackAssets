import { Request, Response } from "express";

// TODO: implement against User/Employee models (Prisma) + bcrypt + jsonwebtoken

export async function signup(_req: Request, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function login(_req: Request, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function forgotPassword(_req: Request, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function logout(_req: Request, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
