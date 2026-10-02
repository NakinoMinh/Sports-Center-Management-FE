import { useContext } from "react";
import { ToastContext, type ToastApi } from "../components/common/toastContext";

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside a ToastProvider.");
  return api;
}
