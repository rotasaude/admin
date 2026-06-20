// Login — única tela acessível sem sessão. POST /session.

import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function Login() {
  const { login } = useAuth();
  const [ email, setEmail ] = useState("");
  const [ password, setPassword ] = useState("");
  const [ submitting, setSubmitting ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Credenciais inválidas.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Muitas tentativas. Tente novamente em alguns minutos.");
      } else {
        setError((err as Error).message || "Falha ao autenticar.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-panel)",
          padding: 24,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <CompassPath />
          <div style={{ lineHeight: 1.12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Rota Saúde</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Admin Console
            </div>
          </div>
        </header>

        <Field
          label="E-mail"
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Senha"
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />

        {error && (
          <div
            role="alert"
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--down-bg)",
              color: "var(--down)",
              fontSize: 12
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: submitting ? "var(--ink3)" : "var(--ink)",
            color: "var(--panel)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting || !email || !password ? 0.7 : 1
          }}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>

        <GovBrButton />
      </form>
    </div>
  );
}

// Botão gov.br: gera a authorize URL com state random e redireciona.
// Backend recebe ?code= no callback (Phase 3.7 + C11).
function GovBrButton() {
  function startGovBr() {
    const authorizeUrl = import.meta.env.VITE_GOVBR_AUTHORIZE_URL || "";
    const clientId     = import.meta.env.VITE_GOVBR_CLIENT_ID || "";
    const redirectUri  = import.meta.env.VITE_GOVBR_REDIRECT_URI || `${window.location.origin}/auth/govbr/callback`;
    if (!authorizeUrl || !clientId) {
      alert("gov.br ainda não configurado neste ambiente.");
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem("govbr_state", state);
    const url = new URL(authorizeUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "openid profile email govbr_confiabilidades");
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
      <Separator />
      <button
        type="button"
        onClick={startGovBr}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--rule2)",
          background: "var(--panel)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        Entrar com gov.br
      </button>
    </div>
  );
}

function Separator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
      <span style={{ flex: 1, height: 1, background: "var(--rule2)" }} />
      ou
      <span style={{ flex: 1, height: 1, background: "var(--rule2)" }} />
    </div>
  );
}

function Field({
  label, id, type, value, onChange, required, autoComplete
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={id}
        className="mono"
        style={{
          fontSize: 10.5,
          color: "var(--ink3)",
          textTransform: "uppercase",
          letterSpacing: 0.6
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "9px 10px",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          color: "var(--ink)",
          background: "var(--panel)",
          border: "1px solid var(--rule2)",
          borderRadius: 8,
          outline: "none"
        }}
      />
    </div>
  );
}

function CompassPath() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        background: "var(--ink)",
        color: "var(--panel)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="currentColor">
        <circle cx="24" cy="24" r="18" strokeWidth="3" />
        <path d="M8 24 H16 L19 18 L24 30 L29 18 L32 24 H40" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
