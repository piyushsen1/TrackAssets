import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const SEED_PASSWORD = "Password123";

async function upsertUserWithEmployee(params: {
  email: string;
  name: string;
  role: "employee" | "department_head" | "asset_manager" | "admin";
  title?: string;
  departmentId?: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { role: params.role },
    create: {
      email: params.email,
      passwordHash: await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS),
      name: params.name,
      role: params.role,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { email: params.email },
    update: { departmentId: params.departmentId ?? null, userId: user.id },
    create: {
      email: params.email,
      name: params.name,
      title: params.title,
      departmentId: params.departmentId ?? null,
      userId: user.id,
    },
  });

  return { user, employee };
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "piyushkumarsen45@gmail.com" },
    update: {},
    create: {
      email: "piyushkumarsen45@gmail.com",
      passwordHash: await bcrypt.hash("Admin@123", SALT_ROUNDS),
      name: "System Admin",
      role: "admin",
    },
  });

  const engineering = await prisma.department.upsert({
    where: { id: "seed-dept-engineering" },
    update: {},
    create: { id: "seed-dept-engineering", name: "Engineering", status: "active" },
  });

  await prisma.department.upsert({
    where: { id: "seed-dept-qa" },
    update: {},
    create: {
      id: "seed-dept-qa",
      name: "Quality Assurance",
      status: "active",
      parentId: engineering.id,
    },
  });

  const sales = await prisma.department.upsert({
    where: { id: "seed-dept-sales" },
    update: {},
    create: { id: "seed-dept-sales", name: "Sales", status: "active" },
  });

  await prisma.department.upsert({
    where: { id: "seed-dept-hr" },
    update: {},
    create: { id: "seed-dept-hr", name: "Human Resources", status: "active" },
  });

  await prisma.category.upsert({
    where: { id: "seed-cat-electronics" },
    update: {},
    create: {
      id: "seed-cat-electronics",
      name: "Electronics",
      customFields: { warrantyPeriodMonths: 24 },
    },
  });

  await prisma.category.upsert({
    where: { id: "seed-cat-furniture" },
    update: {},
    create: { id: "seed-cat-furniture", name: "Furniture" },
  });

  await prisma.category.upsert({
    where: { id: "seed-cat-vehicles" },
    update: {},
    create: {
      id: "seed-cat-vehicles",
      name: "Vehicles",
      customFields: { registrationRequired: true },
    },
  });

  await upsertUserWithEmployee({
    email: "manager@assetflow.test",
    name: "Alex Asset-Manager",
    role: "asset_manager",
    title: "Asset Manager",
    departmentId: engineering.id,
  });

  const { employee: deptHead } = await upsertUserWithEmployee({
    email: "depthead@assetflow.test",
    name: "Dana Dept-Head",
    role: "department_head",
    title: "Engineering Lead",
    departmentId: engineering.id,
  });

  await prisma.department.update({
    where: { id: engineering.id },
    data: { headEmployeeId: deptHead.id },
  });

  await upsertUserWithEmployee({
    email: "priya@assetflow.test",
    name: "Priya Employee",
    role: "employee",
    title: "Sales Associate",
    departmentId: sales.id,
  });

  await upsertUserWithEmployee({
    email: "raj@assetflow.test",
    name: "Raj Employee",
    role: "employee",
    title: "Sales Associate",
    departmentId: sales.id,
  });

  console.log("Seed complete. Test accounts (password for all non-admin: 'Password123'):");
  console.log({ admin: admin.email, adminPassword: "Admin@123" });
  console.log({ assetManager: "manager@assetflow.test" });
  console.log({ departmentHead: "depthead@assetflow.test" });
  console.log({ employees: ["priya@assetflow.test", "raj@assetflow.test"] });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
