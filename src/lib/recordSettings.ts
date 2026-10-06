// Regras da ficha da cidade (módulo 16, ADR 0028; contratos §2 e §4).
// Puras: nenhum React, nenhum fetch.
//
// O operador edita record_mode, ibge_code e pec_url. Os interruptores
// (features) são SÓ LEITURA no console: quem liga e desliga é o maintenance.
// O que falta para um interruptor funcionar (`missing`) vem do servidor; a
// tela só traduz os códigos.

import { ApiError, apiErrorCode, type RecordSettingsPatch } from "./api";
import type { CityDetail, CityFeatureState, RecordMode } from "./types";

export const RECORD_MODES: { value: RecordMode; label: string; hint: string }[] = [
  { value: "off", label: "Desligado", hint: "nenhuma ficha sai para o e-SUS" },
  {
    value: "integrated",
    label: "Integrado ao PEC",
    hint: "o PEC da cidade é o prontuário; o Rota Saúde envia só o que ele mesmo registra"
  },
  {
    value: "record",
    label: "Prontuário Rota Saúde",
    hint: "o Rota Saúde é o prontuário; o repasse da cidade passa a depender das fichas enviadas"
  }
];

export function recordModeLabel(mode: string | null | undefined): string {
  if (!mode) return "—";
  return RECORD_MODES.find((m) => m.value === mode)?.label ?? mode;
}

export function modeChangeWarning(from: string, to: string): string {
  const hint = RECORD_MODES.find((m) => m.value === to)?.hint;
  const consequence = hint ? ` Com o modo novo, ${hint}.` : "";
  return `Mudar o modo de prontuário de "${recordModeLabel(from)}" para "${recordModeLabel(to)}"?${consequence} ` +
    "A mudança fica registrada na auditoria da plataforma.";
}

export interface RecordSettingsValues {
  record_mode: string;
  ibge_code: string;
  pec_url: string;
}

export type RecordSettingsField = "ibge_code" | "pec_url";

// Mensagens fixas: nunca repetem o que foi digitado (a URL pode trazer senha).
export const FIELD_PROBLEMS: Record<RecordSettingsField, string> = {
  ibge_code: "o código IBGE tem 7 dígitos",
  pec_url: "o endereço do PEC começa com https:// e não leva usuário nem senha"
};

// city_reachable opcional: api antigo não manda; ausente = alcançável.
export type RecordFields = Pick<CityDetail, "record_mode" | "ibge_code" | "pec_url"> & { city_reachable?: boolean };

// Banco da cidade inalcançável: o api manda ibge_code null, que NÃO é "vazio".
export function ibgeLocked(city: RecordFields): boolean {
  return city.city_reachable === false;
}

export const IBGE_LOCKED_TEXT =
  "banco da cidade inalcançável ou cidade não ativa: o código IBGE não pode ser lido nem editado agora";

export function formFrom(city: RecordFields): RecordSettingsValues {
  return { record_mode: city.record_mode, ibge_code: city.ibge_code ?? "", pec_url: city.pec_url ?? "" };
}

const IBGE = /^\d{7}$/;

export function pecUrlProblem(raw: string): boolean {
  const value = raw.trim();
  if (value === "") return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return true;
  }
  return url.protocol !== "https:" || url.username !== "" || url.password !== "";
}

export function validateRecordSettings(values: RecordSettingsValues): RecordSettingsField[] {
  const bad: RecordSettingsField[] = [];
  const ibge = values.ibge_code.trim();
  if (ibge !== "" && !IBGE.test(ibge)) bad.push("ibge_code");
  if (pecUrlProblem(values.pec_url)) bad.push("pec_url");
  return bad;
}

function orNull(raw: string): string | null {
  const value = raw.trim();
  return value === "" ? null : value;
}

// Só o que mudou. O modo igual ao atual nunca vai, e vazio vira null (limpa).
// Com a cidade inalcançável, ibge_code nunca vai.
export function recordSettingsPatch(city: RecordFields, values: RecordSettingsValues): RecordSettingsPatch {
  const patch: RecordSettingsPatch = {};
  if (values.record_mode !== city.record_mode) patch.record_mode = values.record_mode as RecordMode;
  const ibge = orNull(values.ibge_code);
  if (!ibgeLocked(city) && ibge !== (city.ibge_code ?? null)) patch.ibge_code = ibge;
  const pec = orNull(values.pec_url);
  if (pec !== (city.pec_url ?? null)) patch.pec_url = pec;
  return patch;
}

export function changesMode(patch: RecordSettingsPatch): boolean {
  return patch.record_mode !== undefined;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_record_mode: "modo de prontuário inválido",
  invalid_ibge_code: FIELD_PROBLEMS.ibge_code,
  invalid_pec_url: FIELD_PROBLEMS.pec_url,
  invalid_city: "o cadastro da cidade tem outro dado inválido; nada foi gravado"
};

// 503 city_unreachable: o IBGE grava no city_profile, no banco da cidade.
const CITY_UNREACHABLE = "o banco da cidade não respondeu; o código IBGE não foi gravado — tente de novo";

export function describeRecordSettingsError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "cidade não encontrada";
    if (err.status === 422) return ERROR_MESSAGES[apiErrorCode(err) ?? ""] ?? "dados inválidos";
    if (err.status === 503 && apiErrorCode(err) === "city_unreachable") return CITY_UNREACHABLE;
  }
  return (err as Error).message;
}

const FEATURE_LABELS: Record<string, string> = {
  ledi_export: "Exportação para o e-SUS (LEDI)",
  cadsus_lookup: "Consulta ao CADSUS"
};

export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

// "(aqui)": o operador resolve nesta ficha. Credencial é da cidade (dashboard,
// tela Integrações, municipal_admin com step-up).
const MISSING_LABELS: Record<string, string> = {
  record_mode_off: "modo de prontuário desligado (aqui)",
  pec_url_missing: "endereço do PEC (aqui)",
  ibge_code_missing: "código IBGE (aqui)",
  "credential_missing:ledi": "credencial do PEC (a cidade cadastra em Integrações)",
  "credential_unauthorized:ledi": "credencial do PEC recusada (a cidade troca em Integrações)",
  "credential_missing:cadsus": "credencial do CADSUS (a cidade cadastra em Integrações)",
  "credential_unauthorized:cadsus": "credencial do CADSUS recusada (a cidade troca em Integrações)",
  city_unreachable: "banco da cidade inalcançável ou cidade não ativa"
};

export function missingLabel(code: string): string {
  return MISSING_LABELS[code] ?? code;
}

export interface FeatureStateView {
  kind: "off" | "usable" | "blocked";
  text: string;
  tone: "neutral" | "ok" | "warn";
}

export function featureState(f: CityFeatureState): FeatureStateView {
  if (!f.enabled) return { kind: "off", text: "desligado", tone: "neutral" };
  if (f.usable) return { kind: "usable", text: "ligado · utilizável", tone: "ok" };
  return { kind: "blocked", text: "ligado · não utilizável", tone: "warn" };
}
