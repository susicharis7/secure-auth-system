import type { AuthContext } from "../modules/auth/authJwtTypes";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export {};
