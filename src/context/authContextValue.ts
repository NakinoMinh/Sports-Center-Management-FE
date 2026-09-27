import { createContext } from "react";
import type { AuthContextType } from "../types/auth";

// Keep Context identity stable when Vite hot-reloads the provider component.
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
