// AuthContext — estado de sessão. Persistido server-side (cookie HttpOnly,
// ADR-0022); o React só decora a UI.
//
// Estados:
//   loading       — primeira chamada a GET /session
//   anonymous     — sem cookie ou expirado
//   mfa_required  — operador logou mas precisa completar TOTP
//   authenticated — sessão completa

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode
} from "react";
import {
  fetchCurrentSession,
  login as apiLogin,
  challengeTotp as apiChallenge,
  logout as apiLogout,
  isMfaRequired,
  setMunicipalityHeader,
  type SessionUser
} from "./api";

type AuthState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "mfa_required"; session_id: string; email_address: string }
  | { kind: "authenticated"; user: SessionUser };

interface AuthValue {
  state: AuthState;
  user: SessionUser | null;
  login: (email_address: string, password: string) => Promise<void>;
  challengeTotp: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  setActiveMunicipality: (id: string | null) => void;
  activeMunicipalityId: string | null;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ state, setState ] = useState<AuthState>({ kind: "loading" });
  const [ activeMunicipalityId, setActiveMunicipalityIdState ] = useState<string | null>(null);

  const pickDefaultMunicipality = useCallback((user: SessionUser) => {
    if (user.memberships[0]) {
      const id = user.memberships[0].municipality_id;
      setActiveMunicipalityIdState(id);
      setMunicipalityHeader(id);
    } else {
      setActiveMunicipalityIdState(null);
      setMunicipalityHeader(null);
    }
  }, []);

  const reload = useCallback(async () => {
    const user = await fetchCurrentSession();
    if (user) {
      setState({ kind: "authenticated", user });
      pickDefaultMunicipality(user);
    } else {
      setState({ kind: "anonymous" });
      setActiveMunicipalityIdState(null);
      setMunicipalityHeader(null);
    }
  }, [ pickDefaultMunicipality ]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email_address: string, password: string) => {
    const res = await apiLogin(email_address, password);
    if (isMfaRequired(res)) {
      setState({ kind: "mfa_required", session_id: res.session_id, email_address });
    } else {
      setState({ kind: "authenticated", user: res });
      pickDefaultMunicipality(res);
    }
  }, [ pickDefaultMunicipality ]);

  const challengeTotp = useCallback(async (code: string) => {
    if (state.kind !== "mfa_required") {
      throw new Error("MFA challenge sem sessão pendente");
    }
    const user = await apiChallenge(state.session_id, code);
    setState({ kind: "authenticated", user });
    pickDefaultMunicipality(user);
  }, [ state, pickDefaultMunicipality ]);

  const cancelMfa = useCallback(() => {
    setState({ kind: "anonymous" });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setActiveMunicipalityIdState(null);
    setMunicipalityHeader(null);
    setState({ kind: "anonymous" });
  }, []);

  const setActiveMunicipality = useCallback((id: string | null) => {
    setActiveMunicipalityIdState(id);
    setMunicipalityHeader(id);
  }, []);

  const value = useMemo<AuthValue>(() => ({
    state,
    user: state.kind === "authenticated" ? state.user : null,
    login,
    challengeTotp,
    cancelMfa,
    logout,
    reload,
    setActiveMunicipality,
    activeMunicipalityId
  }), [ state, login, challengeTotp, cancelMfa, logout, reload, setActiveMunicipality, activeMunicipalityId ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
