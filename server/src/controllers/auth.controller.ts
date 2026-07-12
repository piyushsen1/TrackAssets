import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../config/env";

const SALT_ROUNDS = 10;

export async function signup(req: Request, res: Response) {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "missing_fields", required: ["email", "password", "name"] });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "email_already_registered" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  // An admin may have already added this person to the Employee directory
  // (Organization Setup) before they ever signed up — link the two records
  // by email now so their role can be assigned.
  const unlinkedEmployee = await prisma.employee.findUnique({ where: { email } });
  if (unlinkedEmployee && !unlinkedEmployee.userId) {
    await prisma.employee.update({ where: { id: unlinkedEmployee.id }, data: { userId: user.id } });
  }

  res.status(201).json({ userId: user.id, email: user.email, role: user.role });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields", required: ["email", "password"] });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, employeeId: user.employee?.id, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  res.json({
    token,
    user: { userId: user.id, name: user.name, role: user.role },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: "missing_fields", required: ["email"] });
  }

  // Reset email delivery is out of scope for this build; respond generically either way
  // so the endpoint doesn't leak which emails are registered.
  res.json({ message: "If an account with that email exists, a reset link has been sent." });
}

export async function logout(_req: Request, res: Response) {
  // JWTs are stateless and carry their own expiry; the client is responsible for discarding
  // the token. Nothing server-side to invalidate without adding a token-blacklist store.
  res.json({ message: "logged_out" });
}
