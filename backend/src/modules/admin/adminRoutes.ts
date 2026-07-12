import { Router } from "express";
import {
  listAdminUsersController,
  setUserBlockedStateController,
  listAdminAuditLogsController,
  listAdminReservedUsernamesController,
  createReservedUsernameController,
  updateReservedUsernameController,
  deleteReservedUsernameController,
} from "./adminController";
import {
  requireAuth,
  requireRole,
  requireTwoFactorVerified,
  requireVerifiedActiveUser,
} from "../../middlewares/authMiddleware";

export const adminRouter = Router();

/* Admin-only secured area */
adminRouter.use(requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, requireRole("admin"));

/* Users management */
adminRouter.get("/admin/users", listAdminUsersController);
adminRouter.patch("/admin/users/:id/block", setUserBlockedStateController);

/* Audit logs */
adminRouter.get("/admin/audit-logs", listAdminAuditLogsController);

/* Reserved usernames CRUD */
adminRouter.get("/admin/reserved-usernames", listAdminReservedUsernamesController);
adminRouter.post("/admin/reserved-usernames", createReservedUsernameController);
adminRouter.put("/admin/reserved-usernames/:id", updateReservedUsernameController);
adminRouter.delete("/admin/reserved-usernames/:id", deleteReservedUsernameController);