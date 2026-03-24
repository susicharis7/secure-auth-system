import { Request, Response } from "express";
import { loginUser, registerUser } from "./userService";
import { LoginInput, RegisterInput } from "./userTypes";

export function registerController(req: Request, res: Response) {
  const input = req.body as RegisterInput;
  const result = registerUser(input);
  return res.status(200).json(result);
}

export function loginController(req: Request, res: Response) {
  const input = req.body as LoginInput;
  const result = loginUser(input);
  return res.status(200).json(result);
}
