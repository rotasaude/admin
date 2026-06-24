// Página pública (sem auth) que o convidado abre pelo link do e-mail.
// URL esperado: /admin/?invite=<token>
// POST /setup/accept_invitation { token, password } → cria User + Identity +
// Membership + abre sessão.

import { useState, type FormEvent } from "react";
import { setupAcceptInvitation, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export function AcceptInvitation({ token, onCancel }: { token: string; onCancel: () => void }) {
  const { reload } = useAuth();
  const [ password, setPassword ] = useState("");
  const [ confirmation, setConfirmation ] = useState("");
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ done, setDone ] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      setError("Senha precisa de ao menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Senhas não conferem.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setupAcceptInvitation(token, password);
      await reload();
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Convite inválido ou expirado.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Center>
        <Card>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--up-bg)", color: "var(--up)", fontSize: 13 }}>
            ✓ Conta criada. Você já está autenticado.
          </div>
        </Card>
      </Center>
    );
  }

  return (
    <Center>
      <Card>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Aceitar convite</h2>
          <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
            Defina uma senha para criar sua conta no Rota Saúde.
          </p>
          <Field label="Senha (mín. 12 caracteres)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <Field label="Confirmar senha" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />

          {error && (
            <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy || !password || !confirmation} style={btnPrimary(busy || !password || !confirmation)}>
            {busy ? "Criando…" : "Criar conta"}
          </button>
          <button type="button" onClick={onCancel} style={btnGhost}>Cancelar</button>
        </form>
      </Card>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 22, width: "100%", maxWidth: 420 }}>{children}</div>;
}

function Field({ label, type, value, onChange, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
  color: "var(--ink)", background: "var(--panel)",
  border: "1px solid var(--rule2)", borderRadius: 8, outline: "none"
};

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px", borderRadius: 8, border: "none",
    background: disabled ? "var(--ink3)" : "var(--ink)",
    color: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1
  };
}

const btnGhost: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "transparent", color: "var(--ink2)",
  fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer"
};
