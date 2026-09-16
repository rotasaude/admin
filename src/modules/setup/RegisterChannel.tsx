// Registrar canal WhatsApp de uma cidade (Plano 8) — fala com
// POST /cities/:id/channel. O canal saiu do provisionamento (Plano 4): entra
// quando a Meta libera o número, à parte da criação da cidade.
//
// O access_token é segredo: campo type="password" e a tela nunca o exibe de
// volta — a resposta do servidor também não o devolve (contrato do endpoint).

import { useState, type FormEvent } from "react";
import { useCities } from "../../hooks/useCities";
import { registerCityChannel, ApiError, type RegisterChannelPayload } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";

const EMPTY: RegisterChannelPayload = {
  phone_number_id: "", waba_id: "", display_phone_number: "", access_token: ""
};

export function RegisterChannel() {
  const { data: cities, isLoading } = useCities();
  const activeCities = (cities ?? []).filter((c) => c.status === "active");

  const [ cityId, setCityId ] = useState("");
  const [ form, setForm ] = useState<RegisterChannelPayload>(EMPTY);
  const [ busy, setBusy ] = useState(false);
  const [ apiError, setApiError ] = useState<string | null>(null);
  const [ registered, setRegistered ] = useState(false);

  function set<K extends keyof RegisterChannelPayload>(key: K, value: string) {
    setForm((f) => ({ ...f, [ key ]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cityId) {
      setApiError("selecione uma cidade");
      return;
    }
    setApiError(null);
    setBusy(true);
    try {
      await registerCityChannel(cityId, form);
      setRegistered(true);
      setForm(EMPTY);
    } catch (err) {
      setApiError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PageHeader title="Registrar canal" sub="setup" />
        <Card>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--up-bg)", color: "var(--up)", fontSize: 13 }}>
            Canal registrado. O token de acesso não fica visível depois de enviado.
          </div>
          <button type="button" onClick={() => setRegistered(false)} style={btnPrimary(false)}>
            Registrar outro canal
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Registrar canal" sub="setup" />
      <Card>
        <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
          Liga o número do WhatsApp liberado pela Meta a uma cidade já ativa.
          O token de acesso é um segredo — depois de enviado, não é exibido
          novamente em nenhuma tela.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Cidade">
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              style={inputStyle}
              disabled={isLoading}
            >
              <option value="">selecione…</option>
              {activeCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.uf ? ` · ${c.uf}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Phone number ID">
            <input
              value={form.phone_number_id}
              onChange={(e) => set("phone_number_id", e.target.value)}
              className="mono"
              style={inputStyle}
            />
          </Field>
          <Field label="WABA ID">
            <input
              value={form.waba_id}
              onChange={(e) => set("waba_id", e.target.value)}
              className="mono"
              style={inputStyle}
            />
          </Field>
          <Field label="Número exibido">
            <input
              value={form.display_phone_number}
              onChange={(e) => set("display_phone_number", e.target.value)}
              placeholder="+551133334444"
              className="mono"
              style={inputStyle}
            />
          </Field>
          <Field label="Token de acesso" hint="segredo — não fica visível depois">
            <input
              type="password"
              value={form.access_token}
              onChange={(e) => set("access_token", e.target.value)}
              className="mono"
              style={inputStyle}
            />
          </Field>

          {apiError && (
            <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
              {apiError}
            </div>
          )}

          <button type="submit" disabled={busy} style={btnPrimary(busy)}>
            {busy ? "Registrando…" : "Registrar canal"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "cidade não encontrada";
    if (err.status === 422) {
      const body = err.body as { error?: string; message?: string } | undefined;
      if (body?.error === "city_not_servable") return "a cidade não está ativa";
      return body?.message || "dados inválidos";
    }
  }
  return (err as Error).message;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 22, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}{hint ? ` · ${hint}` : ""}
      </span>
      {children}
    </label>
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
