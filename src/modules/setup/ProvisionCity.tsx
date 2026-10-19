// Provisionar cidade (Plano 8) — fala com POST /cities, não com a tela antiga
// (removida na task anterior porque a rota dela não existe mais).
//
// O endpoint é assíncrono: 202 {id} e o worker faz o resto. Esta tela NUNCA
// promete cidade pronta nem mostra convite — o convite do primeiro admin vai
// por e-mail e o token nunca volta para o console (contrato do Plano 4).

import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createCity, ApiError } from "../../lib/api";
import {
  DEFAULT_TIME_ZONE, TIME_ZONES, suggestedTimeZone, validateProvisionForm, type ProvisionCityPayload
} from "../../lib/provisioning";
import { checkCoatOfArmsFile, describeIdentityError, updateCityIdentity, type CityIdentityPatch } from "../../lib/cityIdentity";
import { PageHeader } from "../../components/PageHeader";
import type { ModuleId } from "../../shell/modules";

const EMPTY: ProvisionCityPayload = {
  slug: "", name: "", uf: "", ibge_code: "", admin_email: "", alert_email: "", time_zone: DEFAULT_TIME_ZONE
};

interface Props {
  onNavigate?: (id: ModuleId) => void;
}

export function ProvisionCity({ onNavigate }: Props) {
  const qc = useQueryClient();
  const [ form, setForm ] = useState<ProvisionCityPayload>(EMPTY);
  const [ fieldErrors, setFieldErrors ] = useState<string[]>([]);
  const [ apiError, setApiError ] = useState<string | null>(null);
  const [ busy, setBusy ] = useState(false);
  const [ createdId, setCreatedId ] = useState<string | null>(null);
  // Enquanto o operador não escolhe, o fuso acompanha a UF digitada.
  const [ zoneTouched, setZoneTouched ] = useState(false);
  // Identidade opcional (órgão + brasão): enviada logo após a cidade existir.
  const [ orgName, setOrgName ] = useState("");
  const [ coat, setCoat ] = useState<File | null>(null);
  const [ coatPreview, setCoatPreview ] = useState<string | null>(null);
  const [ coatError, setCoatError ] = useState<string | null>(null);
  // Aviso só em estado local (spec §6): não persiste.
  const [ identityWarning, setIdentityWarning ] = useState<string | null>(null);
  const [ retrying, setRetrying ] = useState(false);

  useEffect(() => {
    if (!coat) { setCoatPreview(null); return; }
    const url = URL.createObjectURL(coat);
    setCoatPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ coat ]);

  async function chooseCoat(f: File | undefined) {
    if (!f) return;
    const problem = await checkCoatOfArmsFile(f);
    setCoatError(problem);
    setCoat(problem ? null : f);
  }

  function identityPatch(): CityIdentityPatch {
    const patch: CityIdentityPatch = {};
    if (orgName.trim() !== "") patch.healthDepartmentName = orgName.trim();
    if (coat) patch.coatOfArms = coat;
    return patch;
  }

  async function sendIdentity(id: string) {
    const patch = identityPatch();
    if (Object.keys(patch).length === 0) return;
    try {
      await updateCityIdentity(id, patch);
      setIdentityWarning(null);
    } catch (err) {
      setIdentityWarning(describeIdentityError(err));
    }
  }

  async function retryIdentity() {
    if (!createdId) return;
    setRetrying(true);
    await sendIdentity(createdId);
    setRetrying(false);
  }

  function set<K extends keyof ProvisionCityPayload>(key: K, value: string) {
    setForm((f) => ({ ...f, [ key ]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errors = validateProvisionForm(form);
    setFieldErrors(errors);
    if (errors.length > 0 || coatError) return;

    setApiError(null);
    setBusy(true);
    try {
      const res = await createCity(form);
      await sendIdentity(res.id);
      setCreatedId(res.id);
      await qc.invalidateQueries({ queryKey: [ "cities" ] });
    } catch (err) {
      setApiError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (createdId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PageHeader title="Provisionar cidade" sub="setup" />
        <Card>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ok-bg)", color: "var(--ok)", fontSize: 13 }}>
            Cidade registrada. O provisionamento roda em segundo plano; acompanhe o status em Cidades.
          </div>
          {identityWarning && (
            <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: "var(--down-bg)", color: "var(--down)", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
              <span>Cidade criada, mas a identidade não foi salva.</span>
              <span style={{ fontSize: 12 }}>{identityWarning}</span>
              <div>
                <button type="button" onClick={() => void retryIdentity()} disabled={retrying} style={btnGhost}>
                  {retrying ? "Enviando…" : "Tentar de novo"}
                </button>
              </div>
            </div>
          )}
          <button type="button" onClick={() => onNavigate?.("cities")} style={btnPrimary(false)}>
            Ir para Cidades
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Provisionar cidade" sub="setup" />
      <Card>
        <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
          Cria o registro da cidade. O provisionamento do banco e o convite do primeiro
          administrador (por e-mail) rodam depois, em segundo plano.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Slug" hint="rótulo DNS, 2–40 caracteres" error={fieldErrors.includes("slug")}>
            <input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="curitiba"
              className="mono"
              style={inputStyle}
            />
          </Field>
          <Field label="Nome" error={fieldErrors.includes("name")}>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Curitiba"
              style={inputStyle}
            />
          </Field>
          <div className="form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="UF" hint="duas letras maiúsculas" error={fieldErrors.includes("uf")}>
              <input
                value={form.uf}
                onChange={(e) => {
                  const uf = e.target.value.toUpperCase();
                  set("uf", uf);
                  if (!zoneTouched) set("time_zone", suggestedTimeZone(uf));
                }}
                placeholder="PR"
                maxLength={2}
                className="mono"
                style={inputStyle}
              />
            </Field>
            <Field label="Código IBGE" hint="7 dígitos" error={fieldErrors.includes("ibge_code")}>
              <input
                value={form.ibge_code}
                onChange={(e) => set("ibge_code", e.target.value)}
                placeholder="4106902"
                maxLength={7}
                className="mono"
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Fuso horário" hint="prazos, faltas e o 'hoje' da cidade seguem este fuso" error={fieldErrors.includes("time_zone")}>
            <select
              aria-label="Fuso horário"
              value={form.time_zone}
              onChange={(e) => { setZoneTouched(true); set("time_zone", e.target.value); }}
              style={inputStyle}
            >
              {TIME_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
            </select>
          </Field>
          <Field label="E-mail do administrador" error={fieldErrors.includes("admin_email")}>
            <input
              value={form.admin_email}
              onChange={(e) => set("admin_email", e.target.value)}
              placeholder="admin@curitiba.pr.gov.br"
              style={inputStyle}
            />
          </Field>
          <Field label="E-mail de alerta" error={fieldErrors.includes("alert_email")}>
            <input
              value={form.alert_email}
              onChange={(e) => set("alert_email", e.target.value)}
              placeholder="urgencia@curitiba.pr.gov.br"
              style={inputStyle}
            />
          </Field>

          <Field label="Nome oficial do órgão de saúde" hint="opcional, até 120 caracteres">
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} style={inputStyle} />
          </Field>
          <Field label="Brasão" hint="opcional, PNG ou WebP, até 256 KB, 128 a 1024 px" error={coatError !== null}>
            <input
              type="file"
              accept="image/png,image/webp"
              onChange={(e) => { void chooseCoat(e.target.files?.[0]); e.target.value = ""; }}
              style={inputStyle}
            />
          </Field>
          {coatError && <div role="alert" style={{ fontSize: 12, color: "var(--down)" }}>{coatError}</div>}
          {coatPreview && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={coatPreview}
                alt="Prévia do brasão"
                style={{ maxHeight: 96, maxWidth: 96, objectFit: "contain", background: "var(--panel)", border: "1px solid var(--rule2)", borderRadius: 8, padding: 8 }}
              />
              <button type="button" onClick={() => setCoat(null)} style={btnGhost}>Remover brasão</button>
            </div>
          )}

          {fieldErrors.length > 0 && (
            <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
              Campos inválidos: {fieldErrors.join(", ")}
            </div>
          )}
          {apiError && (
            <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>
              {apiError}
            </div>
          )}

          <button type="submit" disabled={busy} style={btnPrimary(busy)}>
            {busy ? "Provisionando…" : "Provisionar cidade"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "já existe uma cidade com esse slug";
    if (err.status === 503) return "o servidor de bancos de cidade não está configurado (CITY_DATABASE_HOST)";
    if (err.status === 422) {
      const body = err.body as { message?: string } | undefined;
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

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="mono" style={{ fontSize: 10.5, color: error ? "var(--down)" : "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}{hint ? ` · ${hint}` : ""}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
  color: "var(--ink)", background: "var(--panel)",
  border: "1px solid var(--rule2)", borderRadius: 8
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
