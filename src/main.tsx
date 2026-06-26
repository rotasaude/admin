import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Fontes self-hosted via @fontsource — sem fetch externo (preferência LGPD/perf).
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import { App } from "./App";
import { Login } from "./modules/Login";
import { MfaChallenge } from "./modules/setup/MfaChallenge";
import { AcceptInvitation } from "./modules/setup/AcceptInvitation";
import { AuthProvider, useAuth } from "./lib/auth";
import { ApiError } from "./lib/api";
import "./theme/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </StrictMode>
);

// AppRoot decide qual surface mostrar:
//   ?invite=<token>             → AcceptInvitation (público)
//   auth.kind = loading         → Splash
//   auth.kind = anonymous       → Login
//   auth.kind = mfa_required    → MfaChallenge
//   auth.kind = authenticated   → App (com QueryClient)
function AppRoot() {
  const auth = useAuth();
  const [ inviteToken, setInviteToken ] = useState<string | null>(() => readInviteFromUrl());

  const [ queryClient ] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError(err) {
        if (err instanceof ApiError && err.status === 401) {
          void auth.reload();
        }
      }
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 404)) return false;
          return count < 1;
        },
        staleTime: 30_000
      }
    }
  }));

  // Quando o user aceita o convite com sucesso, AuthProvider passa para
  // authenticated. Limpa o ?invite= da URL nesse momento.
  useEffect(() => {
    if (auth.state.kind === "authenticated" && inviteToken) {
      setInviteToken(null);
      clearInviteFromUrl();
    }
  }, [ auth.state.kind, inviteToken ]);

  if (inviteToken && auth.state.kind !== "authenticated") {
    return (
      <QueryClientProvider client={queryClient}>
        <AcceptInvitation token={inviteToken} onCancel={() => { setInviteToken(null); clearInviteFromUrl(); }} />
      </QueryClientProvider>
    );
  }

  if (auth.state.kind === "loading") return <Splash />;
  if (auth.state.kind === "anonymous") return <Login />;
  if (auth.state.kind === "mfa_required") return <MfaChallenge />;

  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function readInviteFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("invite");
}

function clearInviteFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url.toString());
}

function Splash() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink3)",
        fontFamily: "var(--font-mono)",
        fontSize: 11
      }}
    >
      …
    </div>
  );
}
