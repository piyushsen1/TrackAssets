import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

// TODO: implement against Department, Category, Employee models (Prisma)

export async function listDepartments(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createDepartment(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function updateDepartment(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function deleteDepartment(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function listCategories(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createCategory(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function listEmployees(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function createEmployee(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}

export async function setEmployeeRole(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "not_implemented" });
}
