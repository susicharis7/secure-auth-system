import express from "express";
import SwaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { authRouter } from "./modules/users/userRoutes";
import { adminRouter } from "./modules/admin/adminRoutes";
import { globalApiLimiter } from "./middlewares/rateLimiters";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Health Check */
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api", (_req, res) => {
  res.status(200).json({
    message: "Secure Auth System API",
    health: "/api/health",
    docs: "/api/docs",
    docsJson: "/api/docs.json",
  });
});

app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));
app.use("/api/docs", SwaggerUi.serve, SwaggerUi.setup(openApiSpec));

app.use("/api", globalApiLimiter);

/* API routers */
app.use("/api", authRouter);
app.use("/api", adminRouter);

const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use("/front", express.static(frontendDistPath));
  app.get(/^\/front\/.*$/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

export default app;
