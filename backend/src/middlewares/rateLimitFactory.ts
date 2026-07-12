import type { Request } from "express";
import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { auditLog } from "../services/auditLogService";
import { maybeAlertCoordinatedAbuse } from "../services/securityAlertService";

type RateLimitKeyStrategy = "ip" | "identifier" | "email";

export type RateLimitHitInput = {
  name: string;
  key: string;
  req: Request;
  windowMs: number;
  limit: number;
};

export type CreateRateLimiterOptions = {
  name: string;
  windowMs: number;
  limit: number;
  keyStrategy?: RateLimitKeyStrategy;
  message?: string;
  objectName?: string;
  onLimitHit?: (input: RateLimitHitInput) => Promise<void> | void;
};

function readIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const ip = req.ip?.trim();
  return ip || "unknown";
}

function readStringValue(req: Request, key: string): string | null {
  const bodyValue = (req.body as Record<string, unknown> | undefined)?.[key];
  if (typeof bodyValue === "string" && bodyValue.trim()) return bodyValue.trim();

  const queryValue = req.query?.[key];
  if (typeof queryValue === "string" && queryValue.trim()) return queryValue.trim();

  return null;
}

function buildKey(req: Request, strategy: RateLimitKeyStrategy): string {
  if (strategy === "identifier") {
    const identifier = readStringValue(req, "identifier");
    if (identifier) return `identifier:${identifier.toLowerCase()}`;
  }

  if (strategy === "email") {
    const email = readStringValue(req, "email");
    if (email) return `email:${email.toLowerCase()}`;
  }

  return `ip:${readIp(req)}`;
}

export function createRateLimiter(options: CreateRateLimiterOptions): RateLimitRequestHandler {
  const strategy = options.keyStrategy ?? "ip";
  const message = options.message ?? "Too many requests, please try again later.";
  const objectName = options.objectName ?? "rate_limit";

  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => buildKey(req, strategy),
    handler: (req, res) => {
      const key = buildKey(req, strategy);

      void auditLog({
        action: "RATE_LIMIT_HIT",
        result: "denied",
        actorId: req.auth?.userId ?? null,
        actorRole: null,
        objectName,
        objectId: key,
        requestData: {
          limiter: options.name,
          route: req.originalUrl,
          method: req.method,
          keyStrategy: strategy,
          windowMs: options.windowMs,
          limit: options.limit,
        },
        req,
      });

      const ipAddress = readIp(req);
      void maybeAlertCoordinatedAbuse(ipAddress);

      if (options.onLimitHit) {
        void Promise.resolve(
          options.onLimitHit({
            name: options.name,
            key,
            req,
            windowMs: options.windowMs,
            limit: options.limit,
          })
        );
      }

      res.status(429).json({
        error: message,
        code: "rate_limited",
        limiter: options.name,
      });
    },
  });
}