import { Router } from "express";
import { authRouter } from "./auth-routes";
import { apiRouter } from "./api-routes";

export const routes = Router();

routes.use("/", apiRouter);      // npr. /api
routes.use("/auth", authRouter); // /api/auth *
