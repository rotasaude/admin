// Enrollment de MFA — primeira vez do user (esp. operador).
// 1. POST /mfa/enroll → recebe otpauth_uri + 10 recovery_codes (mostra UMA VEZ).
// 2. User escaneia QR no autenticador, digita primeiro código.
// 3. POST /mfa/confirm com o código → otp_enabled = true.

import { useState, type FormEvent } from "react";
import { mfaEnroll, mfaConfirm, ApiError, type MfaEnrollPayload } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { QrCode } from "../../components/QrCode";

type Phase = "idle" | "enrolled" | "confirmed";

export function MfaEnroll({ onDone }: { onDone?: () => void }) {
  const { reload } = useAuth();
  const [ phase, setPhase ] = useState<Phase>("idle");
  const [ payload, setPayload ] = useState<MfaEnrollPayload | null>(null);
  const [ code, setCode ] = useState("");
  const [ error, setError ] = useState<string | null>(null);
  const [ busy, setBusy ] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const p = await mfaEnroll();
      setPayload(p);
      setPhase("enrolled");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await mfaConfirm(code.replace(/\s+/g, ""));
      setPhase("confirmed");
      await reload();
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Código inválido. Tente novamente.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ativar autenticação em 2 etapas</h2>
      <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
        Necessária para operadores (publicação de protocolo, troca de cidade).
        Recomendada para todos.
      </p>

      {phase === "idle" && (
        <button onClick={start} disabled={busy} style={btnPrimary(busy)}>
          {busy ? "Gerando…" : "Gerar segredo TOTP"}
        </button>
      )}

      {phase === "enrolled" && payload && (
        <>
          <Section title="1. Escaneie no Authy / Google Auth">
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <QrCode value={payload.otpauth_uri} size={200} alt="QR code para enrollment TOTP" />
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 11, color: "var(--ink3)", margin: 0 }}>
                  Abra seu autenticador e escaneie. Se não der pra escanear, copie a URI abaixo e cole manualmente:
                </p>
                <code style={{ display: "block", padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--rule2)", fontSize: 10.5, wordBreak: "break-all" }}>
                  {payload.otpauth_uri}
                </code>
              </div>
            </div>
          </Section>

          <Section title="2. Anote seus recovery codes (mostrados UMA vez)">
            <ul style={{
              margin: 0, padding: "10px 12px", listStyle: "none",
              background: "var(--bg)", border: "1px solid var(--rule2)", borderRadius: 8,
              fontFamily: "var(--font-mono)", fontSize: 12,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4
            }}>
              {payload.recovery_codes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p style={{ fontSize: 11, color: "var(--down)", margin: 0 }}>
              ⚠ Guarde em local seguro. Se perder o telefone, é com isso que você volta a entrar.
            </p>
          </Section>

          <Section title="3. Digite o código atual do autenticador">
            <form onSubmit={confirm} style={{ display: "flex", gap: 8 }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                inputMode="numeric"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" disabled={busy || !code} style={btnPrimary(busy || !code)}>
                {busy ? "Confirmando…" : "Confirmar"}
              </button>
            </form>
          </Section>
        </>
      )}

      {phase === "confirmed" && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--up-bg)", color: "var(--up)", fontSize: 13 }}>
          ✓ MFA ativado. Da próxima vez que entrar, vamos pedir o código TOTP.
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
          {error}
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 22, width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 14 }}>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {title}
      </div>
      {children}
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
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1
  };
}
