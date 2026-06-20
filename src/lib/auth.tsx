// AuthContext — estado de sessão do Admin Console. Persistido server-side
// (cookie HttpOnly, ADR-0022); o React só decora a UI ao redor.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentSession, login as apiLogin, logout as apiLogout, type SessionUser } from "./api";

type AuthState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "authenticated"; user: SessionUser };

interface AuthValue {
  state: AuthState;
  user: SessionUser | null;
  login: (email_address: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ state, setState ] = useState<AuthState>({ kind: "loading" });

  const reload = useCallback(async () => {
    const user = await fetchCurrentSession();
    setState(user ? { kind: "authenticated", user } : { kind: "anonymous" });
  }, []);

  useEffect(() => {
    void reload();
  }, [ reload ]);

  const login = useCallback(async (email_address: string, password: string) => {
    const user = await apiLogin(email_address, password);
    setState({ kind: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ kind: "anonymous" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        user: state.kind === "authenticated" ? state.user : null,
        login,
        logout,
        reload
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
