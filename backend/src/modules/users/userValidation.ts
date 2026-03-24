import { NextFunction, Request, Response } from "express";

const reservedUsernames = new Set(["admin", "root", "system", "support"]);
const usernameRegex = /^[A-Za-z0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordComplexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

// Google phone library validation can replace this later
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export function validateRegisterInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  // Full Name
  if (!fullName) return res.status(400).json({ error: "Full name is required." });
  if (fullName.length < 3 || fullName.length > 100) {
    return res.status(400).json({ error: "Full name must be between 3 and 100 characters." });
  };

  // Username
  if (!username) return res.status(400).json({ error: "Username is required." });
  if (username.length <= 3) {
    return res.status(400).json({ error: "Username must be longer than 3 characters." });
  };

  if (!usernameRegex.test(username)) {
    return res
      .status(400)
      .json({ error: "Username must be alphanumeric (no spaces/special chars)." });
  };

  if (reservedUsernames.has(username.toLowerCase())) {
    return res.status(400).json({ error: "Username is reserved." });
  };

  // Password
  if (!password) return res.status(400).json({ error: "Password is required." });
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  };

  if (!passwordComplexRegex.test(password)) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number and special character.",
    });
  };


  // Email
  if (!email) return res.status(400).json({ error: "Email is required." });
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  };

  // Phone
  if (!phone) return res.status(400).json({ error: "Phone number is required." });
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: "Invalid mobile phone format." });
  }

  req.body = { fullName, username, password, email, phone };
  return next();
};



export function validateLoginInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier) {
    return res.status(400).json({ error: "Username/Email is required." });
  }

  if (identifier.includes("@")) {
    if (!emailRegex.test(identifier)) return res.status(400).json({ error: "Invalid email format." });
  } else {
    if (!usernameRegex.test(identifier) || identifier.length <= 3) {
      return res.status(400).json({ error: "Invalid username format." });
    }
  };


  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  };

  req.body = { identifier, password };
  return next();
};

