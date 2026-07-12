import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ResultBlock } from "../components/ui/ResultBlock";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import type {
  AdminAuditLogsFilterInput,
  AdminReservedUsernameListItem,
  AdminUsersFilterInput,
  CursorPageMeta,
  DemoUser,
} from "../types/auth";

type AdminDashboardPageProps = {
  user: DemoUser | null;
  onLogout: () => Promise<void>;
  logoutLoading: boolean;
};

type Section = "overview" | "users" | "audit" | "reserved";

type SvgIconProps = {
  className?: string;
  style?: CSSProperties;
};

function IconShield({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 4.5 6v6.4c0 5 3.2 9.5 7.5 11 4.3-1.5 7.5-6 7.5-11V6L12 3Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m9.4 12 1.8 1.8 3.4-3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M15.5 20v-1.7a3.8 3.8 0 0 0-3.8-3.8H6.8A3.8 3.8 0 0 0 3 18.3V20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9.2" cy="8.1" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M21 20v-1.4a3.3 3.3 0 0 0-2.7-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.6 5a3.2 3.2 0 0 1 0 6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconLog({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="3.5" width="16" height="17" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8.3h8M8 12h8M8 15.7h5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconTag({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20.3 11.2 12 19.5a2.4 2.4 0 0 1-3.4 0L4.5 15.4a2.4 2.4 0 0 1 0-3.4l8.3-8.3h7.5v7.5Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.2" cy="7.7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconRefresh({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20 11a8 8 0 0 0-13.7-4.8L4 8.5M4 8.5V4.7M4 8.5h3.8M4 13a8 8 0 0 0 13.7 4.8L20 15.5M20 15.5v3.8M20 15.5h-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowLeft({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowRight({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDown({ className, style }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkles({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m12 3 1.8 4.3L18 9l-4.2 1.7L12 15l-1.8-4.3L6 9l4.2-1.7L12 3ZM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 13l.8 1.7L7.5 15l-1.7.8L5 17.5l-.8-1.7L2.5 15l1.7-.8L5 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function toDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function resultPillClass(result: "success" | "failure" | "denied" | "error"): string {
  return result === "success" ? "status-pill status-pill-ok" : "status-pill status-pill-error";
}

function sectionHeading(icon: ReactNode, kicker: string, heading: string, copy: string) {
  return (
    <div className="admin-section-head">
      <span className="admin-icon-badge">{icon}</span>
      <div>
        <p className="app-kicker">{kicker}</p>
        <h2 className="admin-title">{heading}</h2>
        <p className="admin-copy">{copy}</p>
      </div>
    </div>
  );
}

function overviewValue(value: string | number, label: string) {
  return (
    <div className="admin-kpi-card admin-animate-in">
      <p className="admin-kpi-value">{value}</p>
      <p className="admin-kpi-label">{label}</p>
    </div>
  );
}

function paginationLabel(page: CursorPageMeta | null): string {
  if (!page || page.totalItems === 0) return "Showing 0 results";
  return `Showing ${page.rangeStart} to ${page.rangeEnd} of ${page.totalItems} results`;
}

export function AdminDashboardPage({ user, onLogout, logoutLoading }: AdminDashboardPageProps) {
  const admin = useAdminDashboard();
  const [section, setSection] = useState<Section>("overview");
  const [usersFilterForm, setUsersFilterForm] = useState<AdminUsersFilterInput>({
    searchEmail: "",
    blocked: "all",
  });
  const [auditFilterForm, setAuditFilterForm] = useState<AdminAuditLogsFilterInput>({
    action: "",
    result: "all",
    actorId: "",
    actorRole: "all",
  });
  const [newReservedUsername, setNewReservedUsername] = useState("");
  const [editReservedId, setEditReservedId] = useState<number | null>(null);
  const [editReservedUsername, setEditReservedUsername] = useState("");
  const [pendingUserBlockAction, setPendingUserBlockAction] = useState<{
    id: number;
    email: string;
    blocked: boolean;
  } | null>(null);
  const [pendingReservedDelete, setPendingReservedDelete] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [expandedAuditLogIds, setExpandedAuditLogIds] = useState<Set<number>>(() => new Set());

  const didInitialLoad = useRef(false);
  const didUsersFilterMount = useRef(false);
  const didAuditFilterMount = useRef(false);
  const didReservedSearchMount = useRef(false);

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    void admin.loadUsersPageData({ direction: "next" });
    void admin.loadAuditLogsPageData({ direction: "next" });
    void admin.loadReservedUsernamesPageData({ direction: "next" });
  }, []);

  useEffect(() => {
    if (!didUsersFilterMount.current) {
      didUsersFilterMount.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void admin.loadUsersPageData(
        { direction: "next" },
        {
          searchEmail: usersFilterForm.searchEmail?.trim() || undefined,
          blocked: usersFilterForm.blocked ?? "all",
        }
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [usersFilterForm.searchEmail, usersFilterForm.blocked]);

  useEffect(() => {
    if (!didAuditFilterMount.current) {
      didAuditFilterMount.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void admin.loadAuditLogsPageData(
        { direction: "next" },
        {
          action: auditFilterForm.action?.trim() || undefined,
          result: auditFilterForm.result ?? "all",
          actorId: auditFilterForm.actorId?.trim() || undefined,
          actorRole: auditFilterForm.actorRole ?? "all",
        }
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [auditFilterForm.action, auditFilterForm.result, auditFilterForm.actorId, auditFilterForm.actorRole]);

  useEffect(() => {
    if (!didReservedSearchMount.current) {
      didReservedSearchMount.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void admin.loadReservedUsernamesPageData({ direction: "next" }, admin.reservedSearch);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [admin.reservedSearch]);

  async function handleReservedCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newReservedUsername.trim()) return;
    await admin.createReservedUsername(newReservedUsername.trim());
    setNewReservedUsername("");
  }

  async function handleReservedUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editReservedId || !editReservedUsername.trim()) return;
    await admin.updateReservedUsername(editReservedId, editReservedUsername.trim());
    setEditReservedId(null);
    setEditReservedUsername("");
  }

  async function confirmUserBlockAction() {
    if (!pendingUserBlockAction) return;
    await admin.setUserBlockedState(pendingUserBlockAction.id, pendingUserBlockAction.blocked);
    setPendingUserBlockAction(null);
  }

  async function confirmReservedDelete() {
    if (!pendingReservedDelete) return;
    await admin.deleteReservedUsername(pendingReservedDelete.id);
    setPendingReservedDelete(null);
  }

  function toggleAuditLogDetails(id: number) {
    setExpandedAuditLogIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <PageLayout
      eyebrow="Admin Area"
      title={user ? `Welcome, ${user.fullName}` : "Admin Dashboard"}
      subtitle="Users, audit logs and reserved usernames with backend cursor pagination (10 rows per page)."
    >
      <div className="app-grid-2 admin-shell">
        <aside className="app-card admin-sidebar">
          <div className="admin-sidebar-head">
            <span className="admin-icon-badge">
              <IconShield className="admin-icon" />
            </span>
            <div>
              <p className="app-kicker">Console</p>
              <h2 className="admin-side-title">Admin Controls</h2>
            </div>
          </div>

          <div className="admin-nav-list">
            <button className={section === "overview" ? "btn-nav btn-nav-active" : "btn-nav"} type="button" onClick={() => setSection("overview")}>
              <span className="admin-btn-content">
                <IconSparkles className="admin-btn-icon" />
                Overview
              </span>
            </button>
            <button className={section === "users" ? "btn-nav btn-nav-active" : "btn-nav"} type="button" onClick={() => setSection("users")}>
              <span className="admin-btn-content">
                <IconUsers className="admin-btn-icon" />
                Users
              </span>
            </button>
            <button className={section === "audit" ? "btn-nav btn-nav-active" : "btn-nav"} type="button" onClick={() => setSection("audit")}>
              <span className="admin-btn-content">
                <IconLog className="admin-btn-icon" />
                Audit Logs
              </span>
            </button>
            <button className={section === "reserved" ? "btn-nav btn-nav-active" : "btn-nav"} type="button" onClick={() => setSection("reserved")}>
              <span className="admin-btn-content">
                <IconTag className="admin-btn-icon" />
                Reserved
              </span>
            </button>
          </div>

          <div className="admin-side-user">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">Signed in as</p>
            <p className="admin-user-email">{user?.email ?? "-"}</p>
            <span className="status-pill status-pill-ok">{user?.role ?? "admin"}</span>
          </div>

          <button className="btn-danger mt-3 w-full" type="button" onClick={() => void onLogout()} disabled={logoutLoading}>
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <section className="space-y-5">
          {section === "overview" && (
            <div className="admin-panel admin-animate-in">
              {sectionHeading(
                <IconSparkles className="admin-icon" />,
                "Overview",
                "At-a-glance admin status",
                "Quick snapshot of currently loaded admin datasets."
              )}
              <div className="admin-kpi-grid">
                {overviewValue(admin.usersPage?.totalItems ?? "-", "Total Users")}
                {overviewValue(admin.auditLogsPage?.totalItems ?? "-", "Total Audit Logs")}
                {overviewValue(admin.reservedPage?.totalItems ?? "-", "Reserved Usernames")}
                {overviewValue(admin.usersPage?.limit ?? 10, "Rows Per Page")}
              </div>
            </div>
          )}

          {section === "users" && (
            <div className="animate-[rise-in_300ms_ease_both] rounded-[1.35rem] border border-[rgba(183,148,255,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent),rgba(18,14,30,0.86)] p-[clamp(1.1rem,2vw,1.6rem)] shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[18px]">
              <div className="mb-7 flex items-start gap-4 px-1 pt-1">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border border-[rgba(185,156,255,0.3)] bg-[rgba(155,109,255,0.14)] text-[var(--accent-strong)]">
                  <IconUsers className="h-[1.05rem] w-[1.05rem]" />
                </span>
                <div>
                  <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Users</p>
                  <h2 className="mt-2 text-[clamp(1.35rem,2.3vw,2rem)] font-extrabold leading-tight tracking-[-0.035em] text-white">
                    Users preview and block controls
                  </h2>
                  <p className="mt-3 max-w-[82ch] text-[0.96rem] leading-7 text-[var(--text-muted)]">
                    Filter by email and block state, then block/unblock accounts safely.
                  </p>
                </div>
              </div>

              <div className="mb-5 grid items-end gap-3 rounded-[1.1rem] border border-[rgba(183,148,255,0.12)] bg-[rgba(10,8,18,0.52)] p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <label className="grid gap-2">
                  <span className="text-[0.73rem] font-extrabold uppercase tracking-[0.1em] text-[#d8cff0]">Email search</span>
                  <span className="relative block">
                    <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                    <input
                      className="h-12 w-full rounded-[0.9rem] border border-[rgba(183,148,255,0.2)] bg-[rgba(8,6,15,0.58)] px-4 pl-11 text-[0.92rem] text-[var(--text-primary)] outline-none transition placeholder:text-[0.88rem] placeholder:tracking-[0.02em] placeholder:text-[var(--text-soft)] focus:border-[rgba(185,156,255,0.74)] focus:bg-[rgba(11,8,20,0.92)] focus:shadow-[0_0_0_4px_rgba(155,109,255,0.17)]"
                      type="text"
                      placeholder="e.g. user@example.com"
                      value={usersFilterForm.searchEmail ?? ""}
                      onChange={(event) => setUsersFilterForm((current) => ({ ...current, searchEmail: event.target.value }))}
                    />
                  </span>
                </label>
                <label className="grid gap-2">
                  <span className="text-[0.73rem] font-extrabold uppercase tracking-[0.1em] text-[#d8cff0]">Blocked state</span>
                  <select
                    className="h-12 w-full rounded-[0.9rem] border border-[rgba(183,148,255,0.2)] bg-[rgba(8,6,15,0.58)] px-4 text-[0.92rem] text-[var(--text-primary)] outline-none transition focus:border-[rgba(185,156,255,0.74)] focus:bg-[rgba(11,8,20,0.92)] focus:shadow-[0_0_0_4px_rgba(155,109,255,0.17)]"
                    value={usersFilterForm.blocked ?? "all"}
                    onChange={(event) =>
                      setUsersFilterForm((current) => ({
                        ...current,
                        blocked: event.target.value as "all" | "true" | "false",
                      }))
                    }
                  >
                    <option value="all">All</option>
                    <option value="false">Unblocked</option>
                    <option value="true">Blocked</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3">
                {admin.users.length === 0 && (
                  <p className="m-0 rounded-2xl border border-dashed border-[rgba(183,148,255,0.22)] bg-[rgba(11,8,20,0.38)] p-4 text-sm text-[var(--text-muted)]">
                    No users found for selected filters.
                  </p>
                )}
                {admin.users.map((item) => (
                  <article
                    key={item.id}
                    className="grid items-center gap-5 rounded-2xl border border-[rgba(183,148,255,0.12)] bg-[rgba(11,8,20,0.56)] p-4 xl:grid-cols-[minmax(0,1fr)_270px]"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <p className="m-0 break-words text-base font-black text-[var(--text-primary)]">{item.email}</p>
                      </div>
                      <div className="mt-3 grid gap-3 text-[0.86rem] leading-snug text-[var(--text-muted)] md:grid-cols-[110px_130px_minmax(180px,1fr)]">
                        <p className="m-0"><span className="font-black text-[#ded4f6]">ID:</span> {item.id}</p>
                        <p className="m-0"><span className="font-black text-[#ded4f6]">Role:</span> {item.role}</p>
                        <p className="m-0"><span className="font-black text-[#ded4f6]">Created:</span> {toDateLabel(item.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 xl:items-end">
                      <div className="grid grid-cols-[92px_160px] items-center gap-3">
                      <span
                        className={
                          item.isBlocked
                            ? "inline-flex h-8 w-[92px] items-center justify-center rounded-full border border-[rgba(255,107,154,0.34)] bg-[rgba(255,107,154,0.12)] text-[0.72rem] font-black uppercase tracking-[0.04em] text-[#ff9fbd]"
                            : "inline-flex h-8 w-[92px] items-center justify-center rounded-full border border-[rgba(89,230,167,0.34)] bg-[rgba(89,230,167,0.12)] text-[0.72rem] font-black uppercase tracking-[0.04em] text-[#94f6c4]"
                        }
                      >
                        {item.isBlocked ? "Blocked" : "Active"}
                      </span>
                      <button
                        className={
                          item.isBlocked
                            ? "flex h-11 w-40 items-center justify-center rounded-[0.9rem] border border-[rgba(183,148,255,0.18)] bg-[rgba(18,14,30,0.76)] px-4 text-center text-[0.9rem] font-extrabold text-[#eee8ff] transition hover:-translate-y-px hover:border-[rgba(185,156,255,0.48)] hover:bg-[rgba(34,25,58,0.82)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                            : "flex h-11 w-40 items-center justify-center rounded-[0.9rem] border border-[rgba(255,107,154,0.36)] bg-[rgba(104,30,60,0.52)] px-4 text-center text-[0.9rem] font-extrabold text-[#ffdbe7] transition hover:-translate-y-px hover:border-[rgba(255,107,154,0.68)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                        }
                        type="button"
                        disabled={admin.loading.userBlockUpdate || item.id === user?.id}
                        onClick={() => setPendingUserBlockAction({ id: item.id, email: item.email, blocked: !item.isBlocked })}
                      >
                        {admin.loading.userBlockUpdate ? "Saving..." : item.isBlocked ? "Unblock User" : "Block User"}
                      </button>
                      </div>
                      {item.id === user?.id && <p className="m-0 text-right text-[0.76rem] text-[var(--warning)]">Self-block is disabled.</p>}
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-[0.72rem] font-black uppercase tracking-[0.1em] text-[var(--text-soft)]">
                  {paginationLabel(admin.usersPage)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="flex h-11 w-28 items-center justify-center rounded-[0.9rem] border border-[rgba(183,148,255,0.18)] bg-[rgba(18,14,30,0.76)] px-4 text-center text-[0.9rem] font-extrabold text-[#eee8ff] transition hover:-translate-y-px hover:border-[rgba(185,156,255,0.48)] hover:bg-[rgba(34,25,58,0.82)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                    type="button"
                    disabled={!admin.usersPage?.hasPrev || !admin.usersPage.prevCursor || admin.loading.usersList}
                    onClick={() => void admin.loadUsersPageData({ direction: "prev", cursor: admin.usersPage?.prevCursor ?? undefined })}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconArrowLeft className="h-[1.05rem] w-[1.05rem]" />
                      Prev
                    </span>
                  </button>
                  <button
                    className="flex h-11 w-28 items-center justify-center rounded-[0.9rem] border border-[rgba(183,148,255,0.18)] bg-[rgba(18,14,30,0.76)] px-4 text-center text-[0.9rem] font-extrabold text-[#eee8ff] transition hover:-translate-y-px hover:border-[rgba(185,156,255,0.48)] hover:bg-[rgba(34,25,58,0.82)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                    type="button"
                    disabled={!admin.usersPage?.hasNext || !admin.usersPage.nextCursor || admin.loading.usersList}
                    onClick={() => void admin.loadUsersPageData({ direction: "next", cursor: admin.usersPage?.nextCursor ?? undefined })}
                  >
                    <span className="inline-flex items-center gap-2">
                      Next
                      <IconArrowRight className="h-[1.05rem] w-[1.05rem]" />
                    </span>
                  </button>
                  <button
                    className="flex h-11 w-32 items-center justify-center rounded-[0.9rem] border border-[rgba(183,148,255,0.18)] bg-[rgba(18,14,30,0.76)] px-4 text-center text-[0.9rem] font-extrabold text-[#eee8ff] transition hover:-translate-y-px hover:border-[rgba(185,156,255,0.48)] hover:bg-[rgba(34,25,58,0.82)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                    type="button"
                    disabled={admin.loading.usersList}
                    onClick={() => void admin.loadUsersPageData({ direction: "next" })}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconRefresh className="h-[1.05rem] w-[1.05rem]" />
                      Refresh
                    </span>
                  </button>
                </div>
              </div>

              {admin.results.userBlockUpdate && <ResultBlock title="User access updated" result={admin.results.userBlockUpdate} />}
            </div>
          )}

          {section === "audit" && (
            <div className="admin-panel admin-animate-in">
              {sectionHeading(
                <IconLog className="admin-icon" />,
                "Audit Logs",
                "Filterable audit timeline",
                "Browse all tracked events with actor/action filters."
              )}

              <div className="admin-toolbar-grid admin-toolbar-grid-audit">
                <label className="admin-field">
                  <span>Action contains</span>
                  <span className="admin-input-shell">
                    <IconSearch className="admin-input-icon" />
                    <input
                      className="app-input app-input-with-icon"
                      type="text"
                      placeholder="AUTH_LOGIN"
                      value={auditFilterForm.action ?? ""}
                      onChange={(event) => setAuditFilterForm((current) => ({ ...current, action: event.target.value }))}
                    />
                  </span>
                </label>
                <label className="admin-field">
                  <span>Result</span>
                  <select
                    className="app-input"
                    value={auditFilterForm.result ?? "all"}
                    onChange={(event) =>
                      setAuditFilterForm((current) => ({
                        ...current,
                        result: event.target.value as "success" | "failure" | "denied" | "error" | "all",
                      }))
                    }
                  >
                    <option value="all">All</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="denied">Denied</option>
                    <option value="error">Error</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Actor ID</span>
                  <span className="admin-input-shell">
                    <IconSearch className="admin-input-icon" />
                    <input
                      className="app-input app-input-with-icon"
                      type="text"
                      placeholder="e.g. 1"
                      value={auditFilterForm.actorId ?? ""}
                      onChange={(event) => setAuditFilterForm((current) => ({ ...current, actorId: event.target.value }))}
                    />
                  </span>
                </label>
                <label className="admin-field">
                  <span>Actor Role</span>
                  <select
                    className="app-input"
                    value={auditFilterForm.actorRole ?? "all"}
                    onChange={(event) =>
                      setAuditFilterForm((current) => ({
                        ...current,
                        actorRole: event.target.value as "user" | "admin" | "system" | "all",
                      }))
                    }
                  >
                    <option value="all">All</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="system">System</option>
                  </select>
                </label>
              </div>

              <div className="admin-list-grid">
                {admin.auditLogs.length === 0 && <p className="admin-empty-text">No audit logs found.</p>}
                {admin.auditLogs.map((item) => {
                  const expanded = expandedAuditLogIds.has(item.id);

                  return (
                  <article key={item.id} className={expanded ? "audit-log-row audit-log-row-expanded" : "audit-log-row"}>
                    <button
                      className={expanded ? "audit-log-toggle audit-log-toggle-open" : "audit-log-toggle"}
                      type="button"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Collapse audit log details" : "Expand audit log details"}
                      onClick={() => toggleAuditLogDetails(item.id)}
                    >
                      <IconChevronDown
                        className="admin-icon"
                        style={{
                          transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                          transition: "transform 220ms ease",
                        }}
                      />
                    </button>
                    <div className="audit-log-content">
                      <div className="admin-row-top">
                        <p className="admin-row-title">{item.action}</p>
                      </div>
                      <div className="audit-summary-grid">
                        <div><span>Timestamp</span><strong>{toDateLabel(item.timestamp)}</strong></div>
                        <div><span>Actor</span><strong>{item.actorRole ?? "-"} / {item.actorId ?? "-"}</strong></div>
                        <div><span>Object</span><strong>{item.objectName ?? "-"}</strong></div>
                      </div>
                      {expanded && (
                        <div className="audit-field-grid">
                          <div className="audit-field"><span>Audit ID</span><strong>{item.id}</strong></div>
                          <div className="audit-field"><span>Timestamp</span><strong>{toDateLabel(item.timestamp)}</strong></div>
                          <div className="audit-field"><span>Actor</span><strong>{item.actorRole ?? "-"} / {item.actorId ?? "-"}</strong></div>
                          <div className="audit-field"><span>Object</span><strong>{item.objectName ?? "-"} ({item.objectId ?? "-"})</strong></div>
                          <div className="audit-field"><span>IP address</span><strong>{item.ipAddress ?? "-"}</strong></div>
                          <div className="audit-field audit-field-wide"><span>User agent</span><strong>{item.userAgent ?? "-"}</strong></div>
                        </div>
                      )}
                    </div>
                    <div className="audit-result-slot">
                      <span className={resultPillClass(item.result)}>{item.result}</span>
                    </div>
                  </article>
                );
                })}
              </div>

              <div className="admin-pager">
                <p className="admin-pager-label">{paginationLabel(admin.auditLogsPage)}</p>
                <div className="admin-pager-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={!admin.auditLogsPage?.hasPrev || !admin.auditLogsPage.prevCursor || admin.loading.auditLogsList}
                    onClick={() => void admin.loadAuditLogsPageData({ direction: "prev", cursor: admin.auditLogsPage?.prevCursor ?? undefined })}
                  >
                    <span className="admin-btn-content">
                      <IconArrowLeft className="admin-btn-icon" />
                      Prev
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={!admin.auditLogsPage?.hasNext || !admin.auditLogsPage.nextCursor || admin.loading.auditLogsList}
                    onClick={() => void admin.loadAuditLogsPageData({ direction: "next", cursor: admin.auditLogsPage?.nextCursor ?? undefined })}
                  >
                    <span className="admin-btn-content">
                      Next
                      <IconArrowRight className="admin-btn-icon" />
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={admin.loading.auditLogsList}
                    onClick={() => void admin.loadAuditLogsPageData({ direction: "next" })}
                  >
                    <span className="admin-btn-content">
                      <IconRefresh className="admin-btn-icon" />
                      Refresh
                    </span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {section === "reserved" && (
            <div className="admin-panel admin-animate-in">
              {sectionHeading(
                <IconTag className="admin-icon" />,
                "Reserved Usernames",
                "Create, update and delete reserved usernames",
                "Reserved list is paginated and filterable with backend cursor pagination."
              )}

              <div className="admin-toolbar-grid">
                <label className="admin-field">
                  <span>Search username</span>
                  <span className="admin-input-shell">
                    <IconSearch className="admin-input-icon" />
                    <input
                      className="app-input app-input-with-icon"
                      type="text"
                      placeholder="support"
                      value={admin.reservedSearch}
                      onChange={(event) => admin.setReservedSearch(event.target.value)}
                    />
                  </span>
                </label>
              </div>

              <form className="admin-toolbar-grid" onSubmit={handleReservedCreate}>
                <label className="admin-field">
                  <span>Add reserved username</span>
                  <input
                    className="app-input"
                    type="text"
                    placeholder="new_reserved_username"
                    value={newReservedUsername}
                    onChange={(event) => setNewReservedUsername(event.target.value)}
                  />
                </label>
                <div className="admin-toolbar-actions">
                  <button className="btn-primary" type="submit" disabled={admin.loading.reservedCreate}>
                    {admin.loading.reservedCreate ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>

              {editReservedId !== null && (
                <form className="admin-toolbar-grid admin-edit-panel" onSubmit={handleReservedUpdate}>
                  <label className="admin-field">
                    <span>Edit username #{editReservedId}</span>
                    <input
                      className="app-input"
                      type="text"
                      value={editReservedUsername}
                      onChange={(event) => setEditReservedUsername(event.target.value)}
                    />
                  </label>
                  <div className="admin-toolbar-actions">
                    <button className="btn-primary" type="submit" disabled={admin.loading.reservedUpdate}>
                      {admin.loading.reservedUpdate ? "Saving..." : "Save"}
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => { setEditReservedId(null); setEditReservedUsername(""); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="admin-list-grid">
                {admin.reservedUsernames.length === 0 && <p className="admin-empty-text">No reserved usernames found.</p>}
                {admin.reservedUsernames.map((item: AdminReservedUsernameListItem) => (
                  <article key={item.id} className="admin-row-card">
                    <div className="admin-row-main">
                      <div className="admin-row-top">
                        <p className="admin-row-title">{item.username}</p>
                      </div>
                      <div className="admin-meta-grid">
                        <p><span>ID:</span> {item.id}</p>
                        <p><span>Created:</span> {toDateLabel(item.createdAt)}</p>
                      </div>
                    </div>
                    <div className="admin-row-actions">
                      <span className="status-pill status-pill-ok">Reserved</span>
                      <button className="btn-secondary" type="button" onClick={() => { setEditReservedId(item.id); setEditReservedUsername(item.username); }}>
                        Edit
                      </button>
                      <button className="btn-danger" type="button" disabled={admin.loading.reservedDelete} onClick={() => setPendingReservedDelete({ id: item.id, username: item.username })}>
                        {admin.loading.reservedDelete ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="admin-pager">
                <p className="admin-pager-label">{paginationLabel(admin.reservedPage)}</p>
                <div className="admin-pager-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={!admin.reservedPage?.hasPrev || !admin.reservedPage.prevCursor || admin.loading.reservedList}
                    onClick={() => void admin.loadReservedUsernamesPageData({ direction: "prev", cursor: admin.reservedPage?.prevCursor ?? undefined })}
                  >
                    <span className="admin-btn-content">
                      <IconArrowLeft className="admin-btn-icon" />
                      Prev
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={!admin.reservedPage?.hasNext || !admin.reservedPage.nextCursor || admin.loading.reservedList}
                    onClick={() => void admin.loadReservedUsernamesPageData({ direction: "next", cursor: admin.reservedPage?.nextCursor ?? undefined })}
                  >
                    <span className="admin-btn-content">
                      Next
                      <IconArrowRight className="admin-btn-icon" />
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={admin.loading.reservedList}
                    onClick={() => void admin.loadReservedUsernamesPageData({ direction: "next" })}
                  >
                    <span className="admin-btn-content">
                      <IconRefresh className="admin-btn-icon" />
                      Refresh
                    </span>
                  </button>
                </div>
              </div>

              {admin.results.reservedCreate && <ResultBlock title="Reserved username created" result={admin.results.reservedCreate} />}
              {admin.results.reservedUpdate && <ResultBlock title="Reserved username updated" result={admin.results.reservedUpdate} />}
              {admin.results.reservedDelete && <ResultBlock title="Reserved username deleted" result={admin.results.reservedDelete} />}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingUserBlockAction !== null}
        title={pendingUserBlockAction?.blocked ? "Block user account?" : "Unblock user account?"}
        message={
          pendingUserBlockAction
            ? pendingUserBlockAction.blocked
              ? `User ${pendingUserBlockAction.email} will immediately lose active sessions and trusted device access.`
              : `User ${pendingUserBlockAction.email} will regain ability to log in.`
            : ""
        }
        confirmLabel={pendingUserBlockAction?.blocked ? "Block user" : "Unblock user"}
        confirmVariant={pendingUserBlockAction?.blocked ? "danger" : "primary"}
        loading={Boolean(admin.loading.userBlockUpdate)}
        onCancel={() => setPendingUserBlockAction(null)}
        onConfirm={confirmUserBlockAction}
      />

      <ConfirmDialog
        open={pendingReservedDelete !== null}
        title="Delete reserved username?"
        message={
          pendingReservedDelete
            ? `Username "${pendingReservedDelete.username}" will be removed from reserved list.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={Boolean(admin.loading.reservedDelete)}
        onCancel={() => setPendingReservedDelete(null)}
        onConfirm={confirmReservedDelete}
      />
    </PageLayout>
  );
}
