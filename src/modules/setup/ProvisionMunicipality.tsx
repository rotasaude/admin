// Provisionamento de município — APENAS para operador.
// Cria muni + canal WhatsApp + invite do 1º admin + termo de consentimento
// + alert recipients. Wraps ProvisionMunicipality command via /setup/municipalities.

import { useState, type FormEvent } from "react";
import { setupProvisionMunicipality, ApiError, type ProvisionPayload, type ProvisionResult } from "../../lib/api";

export function ProvisionMunicipality() {
  const [ form, setForm ] = useState<ProvisionPayload>(initialForm());
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ done, setDone ] = useState<ProvisionResult | null>(null);

  function setField<K extends keyof ProvisionPayload>(k: K, v: ProvisionPayload[K]) {
    setForm({ ...form, [k]: v });
  }

  function setChannel<K extends keyof ProvisionPayload["channel"]>(k: K, v: ProvisionPayload["channel"][K]) {
    setForm({ ...form, channel: { ...form.channel, [k]: v } });
  }

  function setTerms<K extends keyof ProvisionPayload["terms"]>(k: K, v: ProvisionPayload["terms"][K]) {
    setForm({ ...form, terms: { ...form.terms, [k]: v } });
  }

  function setAlertAt(idx: number, k: keyof ProvisionPayload["alert"][0], v: string | number) {
    const next = [...form.alert];
    next[idx] = { ...next[idx], [k]: v };
    setForm({ ...form, alert: next });
  }

  function addAlert() {
    setForm({ ...form, alert: [...form.alert, { channel: "email", destination: "", escalation_order: form.alert.length }] });
  }

  function removeAlertAt(idx: number) {
    setForm({ ...form, alert: form.alert.filter((_, i) => i !== idx) });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await setupProvisionMunicipality(form);
      setDone(result);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string; message?: string } | null;
        setError(body?.message || body?.error || `Erro ${err.status}`);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Page title="Província criada">
        <div style={{ padding: 14, borderRadius: 8, background: "var(--up-bg)", color: "var(--up)" }}>
          ✓ <strong>{done.name}</strong> (slug <code>{done.slug}</code>) provisionada.
          Um convite foi enviado para <code>{form.admin_email}</code>.
        </div>
        <button onClick={() => { setDone(null); setForm(initialForm()); }} style={btnGhost}>
          Provisionar outra
        </button>
      </Page>
    );
  }

  return (
    <Page title="Provisionar nova cidade">
      <p style={{ fontSize: 12, color: "var(--ink3)", marginTop: -8 }}>
        Apenas operadores de plataforma podem provisionar. O 1º admin recebe um e-mail
        com link de aceite e define a senha lá. ADR-0024.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <Group title="Cidade">
          <Row>
            <Field label="Nome" value={form.name} onChange={(v) => setField("name", v)} required />
            <Field label="UF" value={form.uf || ""} onChange={(v) => setField("uf", v)} maxWidth={70} />
          </Row>
          <Row>
            <Field label="Slug" value={form.slug} onChange={(v) => setField("slug", v)} required hint="ex.: curitiba" />
            <Field label="Código IBGE" value={form.ibge_code} onChange={(v) => setField("ibge_code", v)} required hint="7 dígitos" />
          </Row>
        </Group>

        <Group title="Canal WhatsApp (gov)">
          <Row>
            <Field label="phone_number_id" value={form.channel.phone_number_id} onChange={(v) => setChannel("phone_number_id", v)} required />
            <Field label="WABA ID" value={form.channel.waba_id} onChange={(v) => setChannel("waba_id", v)} required />
          </Row>
          <Row>
            <Field label="Número (E.164)" value={form.channel.display_phone_number} onChange={(v) => setChannel("display_phone_number", v)} required hint="+5511…" />
            <Field label="Access token" value={form.channel.access_token} onChange={(v) => setChannel("access_token", v)} required type="password" />
          </Row>
        </Group>

        <Group title="1º admin municipal">
          <Field label="E-mail" value={form.admin_email} onChange={(v) => setField("admin_email", v)} required type="email" />
        </Group>

        <Group title="Termo de consentimento (LGPD)">
          <Row>
            <Field label="Versão" value={form.terms.version || ""} onChange={(v) => setTerms("version", v)} hint="ex.: v1" />
          </Row>
          <Field label="Texto do termo" value={form.terms.body} onChange={(v) => setTerms("body", v)} required textarea />
        </Group>

        <Group title="Destinatários de alerta urgente">
          {form.alert.map((a, i) => (
            <Row key={i}>
              <select
                value={a.channel}
                onChange={(e) => setAlertAt(i, "channel", e.target.value)}
                style={{ ...inputStyle, maxWidth: 130 }}
              >
                <option value="email">email</option>
                <option value="whatsapp">whatsapp</option>
              </select>
              <Field label="Destino" value={a.destination} onChange={(v) => setAlertAt(i, "destination", v)} required />
              <Field label="Ordem" value={String(a.escalation_order ?? i)} onChange={(v) => setAlertAt(i, "escalation_order", Number(v))} maxWidth={80} />
              <button type="button" onClick={() => removeAlertAt(i)} style={{ ...btnGhost, alignSelf: "flex-end" }}>Remover</button>
            </Row>
          ))}
          <button type="button" onClick={addAlert} style={btnGhost}>+ Adicionar destinatário</button>
        </Group>

        {error && (
          <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: "var(--down-bg)", color: "var(--down)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={btnPrimary(busy)}>
          {busy ? "Provisionando…" : "Provisionar"}
        </button>
      </form>
    </Page>
  );
}

function initialForm(): ProvisionPayload {
  return {
    name: "", slug: "", ibge_code: "", uf: "",
    channel: { phone_number_id: "", waba_id: "", display_phone_number: "", access_token: "" },
    admin_email: "",
    terms: { version: "v1", body: "" },
    alert: [ { channel: "email", destination: "", escalation_order: 0 } ]
  };
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h1>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="mono" style={{ margin: 0, fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.7 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>{children}</div>;
}

function Field({
  label, value, onChange, required, type = "text", hint, maxWidth, textarea
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  hint?: string;
  maxWidth?: number;
  textarea?: boolean;
}) {
  const common = { value, required, onChange: (e: any) => onChange(e.target.value), style: { ...inputStyle, width: "100%", minHeight: textarea ? 120 : undefined } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, maxWidth: maxWidth ?? "none" }}>
      <label className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </label>
      {textarea
        ? <textarea {...(common as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        : <input type={type} {...(common as React.InputHTMLAttributes<HTMLInputElement>)} />
      }
      {hint && <span style={{ fontSize: 10.5, color: "var(--ink3)" }}>{hint}</span>}
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
    padding: "10px 14px", borderRadius: 8, border: "none",
    background: disabled ? "var(--ink3)" : "var(--ink)",
    color: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1
  };
}

const btnGhost: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "transparent", color: "var(--ink2)",
  fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer"
};
