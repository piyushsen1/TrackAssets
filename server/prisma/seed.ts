import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import QRCode from "qrcode";

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

  const electronics = await prisma.category.upsert({
    where: { id: "seed-cat-electronics" },
    update: {},
    create: {
      id: "seed-cat-electronics",
      name: "Electronics",
      customFields: { warrantyPeriodMonths: 24 },
    },
  });

  const furniture = await prisma.category.upsert({
    where: { id: "seed-cat-furniture" },
    update: {},
    create: { id: "seed-cat-furniture", name: "Furniture" },
  });

  const vehicles = await prisma.category.upsert({
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

  const sampleAssets = [
    {
      id: "seed-asset-1",
      tag: "AF-0001",
      name: "Dell Latitude 5440 Laptop",
      categoryId: electronics.id,
      departmentId: engineering.id,
      location: "Engineering Floor 2",
      serial: "DL5440-001",
      condition: "Good",
      acquisitionDate: new Date("2025-01-15"),
      acquisitionCost: 1200,
      isBookable: false,
    },
    {
      id: "seed-asset-2",
      tag: "AF-0002",
      name: "HP EliteBook 840 Laptop",
      categoryId: electronics.id,
      departmentId: sales.id,
      location: "Sales Floor 1",
      serial: "HP840-002",
      condition: "Good",
      acquisitionDate: new Date("2025-02-10"),
      acquisitionCost: 1100,
      isBookable: false,
    },
    {
      id: "seed-asset-3",
      tag: "AF-0003",
      name: "Executive Office Desk",
      categoryId: furniture.id,
      departmentId: engineering.id,
      location: "Engineering Floor 2",
      serial: null,
      condition: "Fair",
      acquisitionDate: new Date("2024-08-01"),
      acquisitionCost: 350,
      isBookable: false,
    },
    {
      id: "seed-asset-4",
      tag: "AF-0004",
      name: "Toyota Innova (Company Vehicle)",
      categoryId: vehicles.id,
      departmentId: null,
      location: "Main Parking Lot",
      serial: "VIN-9988776655",
      condition: "Good",
      acquisitionDate: new Date("2023-11-20"),
      acquisitionCost: 24000,
      isBookable: true,
    },
  ];

  for (const assetData of sampleAssets) {
    await prisma.asset.upsert({
      where: { id: assetData.id },
      update: {},
      create: {
        ...assetData,
        qrCodeUrl: await QRCode.toDataURL(assetData.tag),
      },
    });
  }

  console.log("Seed complete. Test accounts (password for all non-admin: 'Password123'):");
  console.log({ admin: admin.email, adminPassword: "Admin@123" });
  console.log({ assetManager: "manager@assetflow.test" });
  console.log({ departmentHead: "depthead@assetflow.test" });
  console.log({ employees: ["priya@assetflow.test", "raj@assetflow.test"] });
  console.log({ assets: sampleAssets.map((a) => a.tag) });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
