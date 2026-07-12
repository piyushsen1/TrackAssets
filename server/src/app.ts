import "express-async-errors";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import openapiDocument from "./docs/openapi.json";

import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import orgRoutes from "./routes/org.routes";
import assetsRoutes from "./routes/assets.routes";
import allocationsRoutes from "./routes/allocations.routes";
import bookingsRoutes from "./routes/bookings.routes";
import maintenanceRoutes from "./routes/maintenance.routes";
import auditsRoutes from "./routes/audits.routes";
import reportsRoutes from "./routes/reports.routes";
import notificationsRoutes from "./routes/notifications.routes";

export const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

const api = express.Router();
api.use("/auth", authRoutes);
api.use("/dashboard", requireAuth, dashboardRoutes);
api.use("/org", requireAuth, orgRoutes);
api.use("/assets", requireAuth, assetsRoutes);
api.use("/", requireAuth, allocationsRoutes);
api.use("/", requireAuth, bookingsRoutes);
api.use("/maintenance", requireAuth, maintenanceRoutes);
api.use("/audits", requireAuth, auditsRoutes);
api.use("/reports", requireAuth, reportsRoutes);
api.use("/notifications", requireAuth, notificationsRoutes);

app.use("/api/v1", api);

app.use(errorHandler);
