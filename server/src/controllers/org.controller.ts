import { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthedRequest, UserRole } from "../middleware/auth";

function toDepartmentResponse(
  dept: Prisma.DepartmentGetPayload<{ include: { head: true } }>
) {
  return {
    deptId: dept.id,
    name: dept.name,
    headEmployeeId: dept.headEmployeeId,
    headEmployeeName: dept.head?.name ?? null,
    parentDeptId: dept.parentId,
    status: dept.status,
  };
}

export async function listDepartments(_req: AuthedRequest, res: Response) {
  const departments = await prisma.department.findMany({
    include: { head: true },
    orderBy: { name: "asc" },
  });
  res.json(departments.map(toDepartmentResponse));
}

export async function createDepartment(req: AuthedRequest, res: Response) {
  const { name, headEmployeeId, parentDeptId, status } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ error: "missing_fields", required: ["name"] });
  }

  const dept = await prisma.department.create({
    data: {
      name,
      headEmployeeId: headEmployeeId ?? null,
      parentId: parentDeptId ?? null,
      status: status ?? "active",
    },
    include: { head: true },
  });

  res.status(201).json(toDepartmentResponse(dept));
}

export async function updateDepartment(req: AuthedRequest, res: Response) {
  const { deptId } = req.params;
  const { name, headEmployeeId, parentDeptId, status } = req.body ?? {};

  const existing = await prisma.department.findUnique({ where: { id: deptId } });
  if (!existing) {
    return res.status(404).json({ error: "department_not_found" });
  }

  const dept = await prisma.department.update({
    where: { id: deptId },
    data: {
      ...(name !== undefined && { name }),
      ...(headEmployeeId !== undefined && { headEmployeeId }),
      ...(parentDeptId !== undefined && { parentId: parentDeptId }),
      ...(status !== undefined && { status }),
    },
    include: { head: true },
  });

  res.json(toDepartmentResponse(dept));
}

export async function deleteDepartment(req: AuthedRequest, res: Response) {
  const { deptId } = req.params;

  const existing = await prisma.department.findUnique({ where: { id: deptId } });
  if (!existing) {
    return res.status(404).json({ error: "department_not_found" });
  }

  const [employeeCount, assetCount, childCount] = await Promise.all([
    prisma.employee.count({ where: { departmentId: deptId } }),
    prisma.asset.count({ where: { departmentId: deptId } }),
    prisma.department.count({ where: { parentId: deptId } }),
  ]);

  if (employeeCount > 0 || assetCount > 0 || childCount > 0) {
    return res.status(409).json({
      error: "department_has_active_references",
      employeeCount,
      assetCount,
      childCount,
    });
  }

  await prisma.department.delete({ where: { id: deptId } });
  res.status(204).send();
}

export async function listCategories(_req: AuthedRequest, res: Response) {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(
    categories.map((c) => ({
      categoryId: c.id,
      name: c.name,
      customFields: c.customFields,
    }))
  );
}

export async function createCategory(req: AuthedRequest, res: Response) {
  const { name, customFields } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ error: "missing_fields", required: ["name"] });
  }

  const category = await prisma.category.create({
    data: { name, customFields: customFields ?? undefined },
  });

  res.status(201).json({
    categoryId: category.id,
    name: category.name,
    customFields: category.customFields,
  });
}

function toEmployeeResponse(
  employee: Prisma.EmployeeGetPayload<{ include: { user: true; department: true } }>
) {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    title: employee.title,
    departmentId: employee.departmentId,
    departmentName: employee.department?.name ?? null,
    status: employee.status,
    role: (employee.user?.role ?? "employee") as UserRole,
    hasAccount: !!employee.userId,
  };
}

export async function listEmployees(_req: AuthedRequest, res: Response) {
  const employees = await prisma.employee.findMany({
    include: { user: true, department: true },
    orderBy: { name: "asc" },
  });
  res.json(employees.map(toEmployeeResponse));
}

export async function createEmployee(req: AuthedRequest, res: Response) {
  const { name, email, deptId, title } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "missing_fields", required: ["name", "email"] });
  }

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "employee_already_exists" });
  }

  // If this email already signed up (Screen 1), link the existing account so
  // they formally become an actionable employee record.
  const matchingUser = await prisma.user.findUnique({ where: { email } });

  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      title: title ?? null,
      departmentId: deptId ?? null,
      userId: matchingUser?.id ?? null,
    },
    include: { user: true, department: true },
  });

  res.status(201).json(toEmployeeResponse(employee));
}

const PROMOTABLE_ROLES: UserRole[] = ["employee", "department_head", "asset_manager"];

export async function setEmployeeRole(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { role } = req.body ?? {};

  if (!PROMOTABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: "invalid_role", allowedRoles: PROMOTABLE_ROLES });
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return res.status(404).json({ error: "employee_not_found" });
  }
  if (!employee.userId) {
    return res.status(409).json({
      error: "employee_has_no_account",
      message: "Employee must sign up and be linked to a user account before a role can be assigned.",
    });
  }

  const user = await prisma.user.update({
    where: { id: employee.userId },
    data: { role },
  });

  res.json({ id: employee.id, email: employee.email, role: user.role });
}
