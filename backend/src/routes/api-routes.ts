import { Router } from "express";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({ message: "API running" });
});

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
