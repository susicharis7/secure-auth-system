import { Router } from "express";
import { loginController, registerController } from "./userController";
import { validateLoginInput, validateRegisterInput } from "./userValidation";

export const authRouter = Router();

authRouter.post("/register", validateRegisterInput, registerController);
authRouter.post("/login", validateLoginInput, loginController);
