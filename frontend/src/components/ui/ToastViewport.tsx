import { useEffect, useState } from "react";
import { subscribeToToasts, type ToastItem } from "../../utils/toast";

const TOAST_TTL_MS = 4200;

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((current) => [...current, toast].slice(-4));

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_TTL_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast-card toast-card-${toast.variant}`} key={toast.id}>
          <span className="toast-dot" />
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
