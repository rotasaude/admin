// Cliente HTTP do Admin Console + setup multi-tenant.
//
//   - Base admin = VITE_ADMIN_API_BASE (default "/admin/api"), proxy via Vite.
//   - Envelope universal nos admin endpoints: { data, as_of }.
//   - Auth: cookie de sessão HttpOnly (ADR-0022). credentials: "include".
//   - X-Municipality-Id: header opcional para operador trocar de cidade
//     (ver setMunicipalityHeader). Backend Phase 4.5 resolve current_municipality
//     a partir desse header quando user.operator?.

const BASE = import.meta.env.VITE_ADMIN_API_BASE || "/admin/api";
const SESSION_BASE = import.meta.env.VITE_SESSION_BASE || "/session";
const SETUP_BASE = "/setup";

// Header dinâmico — alterado pelo ScopePicker quando operador troca cidade.
let municipalityHeader: string | null = null;

export function setMunicipalityHeader(municipalityId: string | null) {
  municipalityHeader = municipalityId;
}

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
      ...(municipalityHeader ? { "X-Municipality-Id": municipalityHeader } : {}),
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

export interface ProvisionPayload {
  name: string;
  slug: string;
  ibge_code: string;
  uf?: string;
  channel: {
    phone_number_id: string;
    waba_id: string;
    display_phone_number: string;
    access_token: string;
  };
  admin_email: string;
  terms: { version?: string; body: string };
  alert: { channel: string; destination: string; escalation_order?: number }[];
  template?: { name: string; definition: unknown };
}

export interface ProvisionResult {
  id: string;
  name: string;
  slug: string;
  invitation: {
    id: string;
    email: string;
    token: string;
    expires_at: string;
    accept_url: string;
  } | null;
}

export async function setupProvisionMunicipality(payload: ProvisionPayload): Promise<ProvisionResult> {
  return jsonFetch<ProvisionResult>(`${SETUP_BASE}/municipalities`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export interface InvitePayload {
  email: string;
  role: string;
  municipality_id?: string;
}

export interface InviteResult {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

export async function setupInviteMember(payload: InvitePayload): Promise<InviteResult> {
  return jsonFetch<InviteResult>(`${SETUP_BASE}/invitations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function setupAcceptInvitation(token: string, password: string): Promise<SessionUser> {
  return jsonFetch<SessionUser>(`${SETUP_BASE}/accept_invitation`, {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

export interface MembershipRow {
  id: string;
  user: { id: string; email_address: string };
  municipality_id: string;
  role: string;
  granted_at: string;
}

export async function setupListMemberships(municipality_id?: string): Promise<MembershipRow[]> {
  const url = new URL(`${SETUP_BASE}/memberships`, window.location.origin);
  if (municipality_id) url.searchParams.set("municipality_id", municipality_id);
  const res = await jsonFetch<{ data: MembershipRow[] }>(url.toString());
  return res.data;
}

export async function setupRevokeMembership(id: string): Promise<{ id: string; revoked_at: string }> {
  return jsonFetch<{ id: string; revoked_at: string }>(`${SETUP_BASE}/memberships/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function setupDeactivateUser(id: string): Promise<{ id: string; deactivated_at: string }> {
  return jsonFetch<{ id: string; deactivated_at: string }>(`${SETUP_BASE}/users/${id}/deactivate`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
