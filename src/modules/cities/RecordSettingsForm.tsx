// Modo de prontuário, código IBGE e endereço do PEC da cidade (módulo 16,
// ADR 0028; contratos §4.1). Decisão de contrato, do operador, auditada no api.
//
// - Mudar o modo sempre pede confirmação antes do PATCH; IBGE e PEC não.
// - O PATCH leva só o que mudou; vazio vai como null (limpa o campo).
// - A URL do PEC é conferida antes de sair (https, sem usuário nem senha) e
//   nenhuma mensagem repete o que foi digitado.
// - Banco da cidade inalcançável (city_reachable: false): o IBGE fica
//   bloqueado; o null que veio não é "vazio".

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { updateCityRecordSettings, type RecordSettingsPatch } from "../../lib/api";
import type { CityDetail } from "../../lib/types";
import {
  FIELD_PROBLEMS, IBGE_LOCKED_TEXT, RECORD_MODES, type RecordFields, changesMode, describeRecordSettingsError, formFrom, ibgeLocked,
  modeChangeWarning, recordSettingsPatch, validateRecordSettings, type RecordSettingsField, type RecordSettingsValues
} from "../../lib/recordSettings";

interface Props {
  city: CityDetail;
  onSaved: (city: CityDetail) => void;
}

export function RecordSettingsForm({ city, onSaved }: Props) {
  // base: o que o operador viu ao abrir (ou o que o último PATCH devolveu). O patch,
  // o bloqueio do IBGE e o "de" da confirmação saem dele, nunca do city vivo.
  const [ base, setBase ] = useState<RecordFields>(city);
  const [ values, setValues ] = useState<RecordSettingsValues>(() => formFrom(city));
  const [ bad, setBad ] = useState<RecordSettingsField[]>([]);
  const [ pending, setPending ] = useState<RecordSettingsPatch | null>(null);
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ notice, setNotice ] = useState<string | null>(null);

  useEffect(() => {
    if (busy || pending !== null) return;
    const a = formFrom(base);
    const dirty = a.record_mode !== values.record_mode || a.ibge_code !== values.ibge_code || a.pec_url !== values.pec_url;
    if (dirty) return;
    setBase(city);
    setValues(formFrom(city));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ city ]);

  function set<K extends keyof RecordSettingsValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [ key ]: value }));
    setNotice(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const problems = validateRecordSettings(values);
    setBad(problems);
    if (problems.length > 0) return;
    const patch = recordSettingsPatch(base, values);
    if (Object.keys(patch).length === 0) {
      setNotice("Nada mudou.");
      return;
    }
    if (changesMode(patch)) {
      setPending(patch);
      return;
    }
    void send(patch);
  }

  async function send(patch: RecordSettingsPatch) {
    setBusy(true);
    try {
      const updated = await updateCityRecordSettings(city.id, patch);
      setBase(updated);
      setValues(formFrom(updated));
      setNotice("Salvo.");
      onSaved(updated);
    } catch (err) {
      setError(describeRecordSettingsError(err));
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  const locked = busy || pending !== null;
  const ibgeOff = ibgeLocked(base);
  const hint = RECORD_MODES.find((m) => m.value === values.record_mode)?.hint;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
      <Field label="Modo de prontuário">
        <select
          value={values.record_mode}
          onChange={(e) => set("record_mode", e.target.value)}
          disabled={locked}
          style={inputStyle}
        >
          {RECORD_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </Field>
      {hint && <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>{hint}</p>}

      <Field
        label="Código IBGE"
        hint="7 dígitos"
        error={ibgeOff ? IBGE_LOCKED_TEXT : bad.includes("ibge_code") ? FIELD_PROBLEMS.ibge_code : undefined}
      >
        <input
          value={values.ibge_code}
          onChange={(e) => set("ibge_code", e.target.value)}
          inputMode="numeric"
          disabled={locked || ibgeOff}
          className="mono"
          style={inputStyle}
        />
      </Field>

      <Field
        label="Endereço do PEC"
        hint="https://, sem usuário nem senha"
        error={bad.includes("pec_url") ? FIELD_PROBLEMS.pec_url : undefined}
      >
        <input
          value={values.pec_url}
          onChange={(e) => set("pec_url", e.target.value)}
          placeholder="https://pec.cidade.gov.br"
          disabled={locked}
          className="mono"
          style={inputStyle}
        />
      </Field>

      {pending && (
        <div
          role="group"
          aria-label="Confirmar mudança de modo"
          style={{ padding: "10px 12px", borderRadius: 8, background: "var(--warn-bg)", color: "var(--ink)", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <p style={{ margin: 0 }}>{modeChangeWarning(base.record_mode, pending.record_mode ?? values.record_mode)}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => { void send(pending); }} disabled={busy} style={btnPrimary(busy)}>
              {busy ? "Salvando…" : "Confirmar mudança"}
            </button>
            <button type="button" onClick={() => setPending(null)} disabled={busy} style={btnGhost}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={{ fontSize: 12, color: "var(--ink2)" }}>{notice}</div>
      )}

      <button type="submit" disabled={locked} style={btnPrimary(locked)}>
        {busy && !pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}{hint ? ` · ${hint}` : ""}
        </span>
        {children}
      </label>
      {error && <span style={{ fontSize: 11.5, color: "var(--down)" }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
  color: "var(--ink)", background: "var(--panel)",
  border: "1px solid var(--rule2)", borderRadius: 8, outline: "none"
};

const btnGhost: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "var(--panel)", color: "var(--ink)", fontSize: 13, cursor: "pointer"
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
