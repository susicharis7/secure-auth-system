import { Request, Response } from "express";
import { loginUser, registerUser, verifyTwoFactorCode } from "./userService";
import { LoginInput, RegisterInput, TwoFactorInput } from "./userTypes";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export function registerController(req: Request, res: Response) {
  const input = req.body as RegisterInput;
  const result = registerUser(input);
  return res.status(result.status).json(result.body);
}

export async function loginController(req: Request, res: Response) {
  try {
    const input = req.body as LoginInput;
    const result = await loginUser(input);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function twoFactorController(req: Request, res: Response) {
  try {
    const input = req.body as TwoFactorInput;
    const result = await verifyTwoFactorCode(input);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
