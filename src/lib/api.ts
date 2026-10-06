// Cliente HTTP do Admin Console + setup multi-tenant.
//
//   - Base admin = VITE_ADMIN_API_BASE (default "/admin/api"), proxy via Vite.
//   - Envelope universal nos admin endpoints: { data, as_of }.
//   - Auth: cookie de sessão HttpOnly (ADR-0022). credentials: "include".

import type { CityDetail, CityRow, RecordMode } from "./types";
import type { ProvisionCityPayload } from "./provisioning";

const BASE = import.meta.env.VITE_ADMIN_API_BASE || "/admin/api";
const SESSION_BASE = import.meta.env.VITE_SESSION_BASE || "/session";
const SETUP_BASE = "/setup";

export interface Envelope<T> {
  data: T & { scope?: ScopeBlock };
  as_of: string;
}

export interface ScopeBlock {
  city: { slug: string; name: string; uf: string | null };
  period: { key: string; label: string; axis: string };
  tz: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Código de erro do corpo JSON ({ error: "..." }) de uma ApiError, se houver.
export function apiErrorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  const body = err.body as { error?: unknown } | null;
  return body && typeof body === "object" && typeof body.error === "string" ? body.error : undefined;
}

export interface Membership {
  city_slug: string;
  city_name: string;
  city_uf: string | null;
  role: string;
}

export interface SessionUser {
  id: string;
  email_address: string;
  mfa_enrolled: boolean;
  operator: boolean;
  mfa_verified_at: string | null;
  memberships: Membership[];
}

// Resposta especial do POST /session quando user é operador.
export interface MfaRequired {
  mfa_required: true;
  session_id: string;
}

export type LoginResponse = SessionUser | MfaRequired;

export function isMfaRequired(r: LoginResponse): r is MfaRequired {
  return (r as MfaRequired).mfa_required === true;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    // fetch consome o stream em qualquer leitura; tenta JSON via text() para
    // não cair em "body stream already read" quando o response não é JSON.
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    if (text) {
      try { body = JSON.parse(text); } catch { /* deixa string */ }
    }
    throw new ApiError(res.status, body, `${res.status} on ${input}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function adminFetch<T>(path: string, params?: Record<string, string | undefined>): Promise<Envelope<T>> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([ k, v ]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }
  return jsonFetch<Envelope<T>>(url.toString());
}

// ─── Sessão ──────────────────────────────────────────────────────────────────

export async function login(email_address: string, password: string): Promise<LoginResponse> {
  return jsonFetch<LoginResponse>(SESSION_BASE, {
    method: "POST",
    body: JSON.stringify({ email_address, password })
  });
}

export async function challengeTotp(session_id: string, code: string): Promise<SessionUser> {
  return jsonFetch<SessionUser>(`${SESSION_BASE}/challenge`, {
    method: "POST",
    body: JSON.stringify({ session_id, code })
  });
}

export async function fetchCurrentSession(): Promise<SessionUser | null> {
  try {
    return await jsonFetch<SessionUser>(SESSION_BASE);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function logout(): Promise<void> {
  await jsonFetch<void>(SESSION_BASE, { method: "DELETE" });
}

// ─── MFA ─────────────────────────────────────────────────────────────────────

export interface MfaEnrollPayload {
  otpauth_uri: string;
  recovery_codes: string[];
}

export async function mfaEnroll(): Promise<MfaEnrollPayload> {
  return jsonFetch<MfaEnrollPayload>("/mfa/enroll", { method: "POST", body: JSON.stringify({}) });
}

export async function mfaConfirm(code: string): Promise<{ ok: true }> {
  return jsonFetch<{ ok: true }>("/mfa/confirm", {
    method: "POST",
    body: JSON.stringify({ code })
  });
}

export async function mfaStepUp(code: string): Promise<{ ok: true }> {
  return jsonFetch<{ ok: true }>("/mfa/step_up", {
    method: "POST",
    body: JSON.stringify({ code })
  });
}

// ─── Setup endpoints (write) ──────────────────────────────────────────────────

export async function setupAcceptInvitation(token: string, password: string): Promise<SessionUser> {
  return jsonFetch<SessionUser>(`${SETUP_BASE}/accept_invitation`, {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

// ─── Console de plataforma (Plano 6) ─────────────────────────────────────────

export interface CityGrant { redirect_url: string; expires_in: number }

export async function listCities(): Promise<CityRow[]> {
  const res = await jsonFetch<{ data: CityRow[] }>("/cities");
  return res.data;
}

export async function createCityGrant(city_slug: string): Promise<CityGrant> {
  return jsonFetch<CityGrant>("/city_grants", {
    method: "POST",
    body: JSON.stringify({ city_slug })
  });
}

export interface CreateCityResult { id: string }

// POST /cities — PlatformConsoleHost, operador com MFA. Assíncrono: 202 {id} e
// o worker provisiona. O convite do primeiro admin vai por e-mail; o token
// nunca volta para o console (contrato do Plano 4).
export async function createCity(payload: ProvisionCityPayload): Promise<CreateCityResult> {
  return jsonFetch<CreateCityResult>("/cities", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// POST /cities/:id/channel — registra o canal WhatsApp de uma cidade ativa
// (Plano 8). O access_token é segredo: nunca volta na resposta.
export interface RegisterChannelPayload {
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  access_token: string;
}

export async function registerCityChannel(cityId: string, payload: RegisterChannelPayload) {
  return jsonFetch<{ id: string; phone_number_id: string; display_phone_number: string; active: boolean }>(
    `/cities/${cityId}/channel`, { method: "POST", body: JSON.stringify(payload) }
  );
}

// GET /unknown_channels — phone_number_ids que chegaram ao webhook do WhatsApp
// sem canal registrado (PlatformConsoleHost, operador). Só leitura; o servidor
// já ordena por last_seen_at desc e corta em 100.
export interface UnknownChannel {
  phone_number_id: string;
  display_phone_number: string | null;
  hits: number;
  first_seen_at: string;
  last_seen_at: string;
}

export async function listUnknownChannels(): Promise<UnknownChannel[]> {
  const res = await jsonFetch<{ unknown_channels: UnknownChannel[] }>("/unknown_channels");
  return res.unknown_channels;
}

// GET /city_analytics (módulo 14, F-14.8) — indicadores semanais que cada
// cidade publicou na plataforma (PlatformConsoleHost, operador). O api lê só
// city_analytics_indicators e cities: nunca abre banco de cidade (ADR 0025).
// Sem from/to, o servidor devolve as 12 semanas que terminam na semana
// anterior à atual — esta tela não manda período, o seletor escolhe entre
// as semanas que vieram.
//
// values[indicator] é alinhado com weeks: número (contagem inteira ou
// percentual com 1 casa), { suppressed: true } (1 a 4, oculto na origem) ou
// null (a cidade não publicou o indicador naquela semana).
export type IndicatorValue = number | { suppressed: true } | null;

export interface CityAnalyticsCity {
  id: string;
  slug: string;
  name: string;
  uf: string | null;
  last_published_at: string | null;
  values: Record<string, IndicatorValue[]>;
}

export interface CityAnalyticsData {
  weeks: string[];
  indicators: string[];
  cities: CityAnalyticsCity[];
}

export async function listCityAnalytics(): Promise<CityAnalyticsData> {
  const res = await jsonFetch<{ data: CityAnalyticsData }>("/city_analytics");
  return res.data;
}

// ─── Módulo 16 (ADR 0028; contratos §4) ─────────────────────────────────────
// Ficha da cidade: GET /cities/:id (objeto solto) e
// PATCH /cities/:id/record_settings (qualquer subconjunto; null limpa o campo).
// null limpa pec_url/ibge_code; record_mode nunca é nulo. 404 { error: "not_found" }.
// 422: invalid_record_mode, invalid_ibge_code, invalid_pec_url, invalid_city
// (cadastro da cidade inválido por outra regra). 503 city_unreachable
// quando ibge_code veio e o banco da cidade não responde: o IBGE mora no
// city_profile da cidade (fonte única, a mesma do provisionamento).
export interface RecordSettingsPatch {
  record_mode?: RecordMode;
  ibge_code?: string | null;
  pec_url?: string | null;
}

export async function getCity(cityId: string): Promise<CityDetail> {
  return jsonFetch<CityDetail>(`/cities/${encodeURIComponent(cityId)}`);
}

export async function updateCityRecordSettings(cityId: string, patch: RecordSettingsPatch): Promise<CityDetail> {
  const res = await jsonFetch<{ city: CityDetail }>(`/cities/${encodeURIComponent(cityId)}/record_settings`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
  return res.city;
}

// GET /city_production (contratos §4.3, §8) — resumo por cidade da competência
// corrente e da anterior (corrente primeiro), no envelope { data }. Entregue
// pelo plano api-exporter. sigtap_alert vem calculado do api (dia ≥ 5).
// Opcionais (tolerados ausentes): sending (campo próprio; pending não o inclui),
// deadline_estimated_on (estimativa em dias úteis, enviada quando a tabela
// oficial do SIAPS diverge) e city_unreachable (cidade inativa/inalcançável).
export type ProductionAlert = "none" | "attention" | "critical";

export interface CompetenceSummary {
  competence: string;          // AAAAMM
  deadline_on: string;         // YYYY-MM-DD
  business_days_left: number;
  accepted: number;
  rejected: number;
  pending: number;             // não inclui sending
  sending?: number;            // em envio; campo próprio
  failed: number;
  alert: ProductionAlert;
  // YYYY-MM-DD; estimativa em dias úteis quando a tabela oficial do SIAPS diverge.
  deadline_estimated_on?: string | null;
}

export interface CityProductionCity {
  slug: string;
  name: string;
  record_mode: RecordMode;
  city_unreachable?: boolean;  // cidade não ativa ou banco inalcançável
  competences: CompetenceSummary[];
}

export interface CityProductionTerminology {
  sigtap_current_competence: string;
  sigtap_imported: boolean;
  sigtap_alert: boolean;
}

export interface CityProductionData {
  cities: CityProductionCity[];
  terminology: CityProductionTerminology;
}

export async function listCityProduction(): Promise<CityProductionData> {
  const res = await jsonFetch<{ data: CityProductionData }>("/city_production");
  return res.data;
}
