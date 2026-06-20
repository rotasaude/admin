// Tela mostrada após o login do operador: pede o TOTP atual para completar a sessão.
// Backend só carimba mfa_verified_at e seta cookie nessa etapa.

import { useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

export function MfaChallenge() {
  const { state, challengeTotp, cancelMfa } = useAuth();
  const [ code, setCode ] = useState("");
  const [ submitting, setSubmitting ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  if (state.kind !== "mfa_required") return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await challengeTotp(code.replace(/\s+/g, ""));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Código inválido. Verifique seu autenticador.");
      } else {
        setError((err as Error).message || "Falha ao verificar.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Header email={state.email_address} />
        <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
          Como operador, você precisa do código TOTP do seu autenticador para entrar.
          Aceita também um recovery code se você perdeu o dispositivo.
        </p>
        <Field
          label="Código"
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
          required
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <button type="submit" disabled={submitting || !code} style={btnPrimary(submitting || !code)}>
          {submitting ? "Verificando…" : "Verificar"}
        </button>
        <button type="button" onClick={cancelMfa} style={btnGhost}>Cancelar</button>
      </form>
    </CenteredCard>
  );
}

function Header({ email }: { email: string }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        2ª etapa
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{email}</div>
    </header>
  );
}

function Field({
  label, value, onChange, required, autoComplete
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        required={required}
        autoComplete={autoComplete}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 24, width: "100%", maxWidth: 360 }}>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 10px",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  color: "var(--ink)",
  background: "var(--panel)",
  border: "1px solid var(--rule2)",
  borderRadius: 8,
  outline: "none"
};

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: disabled ? "var(--ink3)" : "var(--ink)",
    color: "var(--panel)",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1
  };
}

const btnGhost: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--rule2)",
  background: "transparent",
  color: "var(--ink2)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  cursor: "pointer"
};
