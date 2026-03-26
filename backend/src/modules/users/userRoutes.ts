import { Router } from "express";
import { loginController, registerController, twoFactorController } from "./userController";
import { validateLoginInput, validateRegisterInput, validateTwoFactorInput } from "./userValidation";

export const authRouter = Router();

authRouter.post("/register", validateRegisterInput, registerController);
authRouter.post("/login", validateLoginInput, loginController);
authRouter.post("/auth/2fa", validateTwoFactorInput, twoFactorController);
