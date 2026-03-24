import express from "express";
import SwaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { authRouter } from "./modules/users/userRoutes";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Health Check */
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", authRouter);  

app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));
app.use("/api/docs", SwaggerUi.serve, SwaggerUi.setup(openApiSpec));

export default app;
