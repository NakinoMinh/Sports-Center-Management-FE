import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, CircleAlert, Info, X } from "lucide-react";
import {
  ToastContext,
  type Toast,
  type ToastApi,
  type ToastTone,
} from "./toastContext";

/** Success and info self-dismiss; errors stay until the user acknowledges them. */
const LIFETIME_MS: Record<ToastTone, number | null> = {
  success: 4000,
  info: 5000,
  error: null,
};

const icons: Record<ToastTone, typeof BadgeCheck> = {
  success: BadgeCheck,
  error: CircleAlert,
  info: Info,
};

/**
 * Transient feedback rendered in a fixed overlay.
 *
 * These messages used to render inline above the page content, so confirming an
 * action inserted a block into the document flow and pushed everything below it
 * down - the row you just acted on jumped away from the pointer. A fixed layer
 * cannot shift layout.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, action?: Toast["action"]) => {
      const id = nextId.current++;
      // Keep the stack shallow; the oldest message drops off the top.
      setToasts((current) => [...current.slice(-2), { id, tone, message, action }]);

      const lifetime = LIFETIME_MS[tone];
      if (lifetime !== null) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), lifetime),
        );
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message, action) => push("error", message, action),
      info: (message) => push("info", message),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live announces new messages without moving focus away from the
          control the user just used. */}
      <div className="toast-viewport" role="region" aria-label="Thông báo">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              className={`toast toast-${toast.tone}`}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <Icon size={18} aria-hidden="true" className="toast-icon" />
              <p className="toast-message">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast-close"
                aria-label="Đóng thông báo"
                onClick={() => dismiss(toast.id)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
