import { Router } from "express";
import * as orgController from "../controllers/org.controller";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();

router.get("/departments", orgController.listDepartments);
router.post("/departments", requireAdmin, orgController.createDepartment);
router.patch("/departments/:deptId", requireAdmin, orgController.updateDepartment);
router.delete("/departments/:deptId", requireAdmin, orgController.deleteDepartment);

router.get("/categories", orgController.listCategories);
router.post("/categories", requireAdmin, orgController.createCategory);

router.get("/employees", orgController.listEmployees);
router.post("/employees", requireAdmin, orgController.createEmployee);
router.patch("/employees/:id/role", requireAdmin, orgController.setEmployeeRole);

export default router;
