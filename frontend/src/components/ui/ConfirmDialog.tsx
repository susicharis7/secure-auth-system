import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,8,18,0.72)] p-4 backdrop-blur-sm">
      <div className="app-card w-full max-w-md">
        <p className="app-kicker">Confirm Action</p>
        <h3 className="app-heading">{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{message}</p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={confirmVariant === "danger" ? "btn-danger" : "btn-primary"}
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
