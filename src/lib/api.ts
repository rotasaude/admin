// Cliente HTTP do Admin Console + setup multi-tenant.
//
//   - Base admin = VITE_ADMIN_API_BASE (default "/admin/api"), proxy via Vite.
//   - Envelope universal nos admin endpoints: { data, as_of }.
//   - Auth: cookie de sessão HttpOnly (ADR-0022). credentials: "include".

import type { CityRow } from "./types";
import type { ProvisionCityPayload } from "./provisioning";

const BASE = import.meta.env.VITE_ADMIN_API_BASE || "/admin/api";
const SESSION_BASE = import.meta.env.VITE_SESSION_BASE || "/session";
const SETUP_BASE = "/setup";

export interface Envelope<T> {
  data: T & { scope?: ScopeBlock };
  as_of: string;
}

export interface ScopeBlock {
  municipality: { id: string | null; name: string; cross_tenant: boolean };
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

export interface Membership {
  municipality_id: string;
  municipality_name: string;
  municipality_uf: string | null;
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
