import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** Optional inline retry/undo control. */
  action?: { label: string; onClick: () => void };
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string, action?: Toast["action"]) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
