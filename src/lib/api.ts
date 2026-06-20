// Cliente HTTP do Admin Console.
//
//   - Base = VITE_ADMIN_API_BASE (default "/admin/api"), Vite proxa pro Rails.
//   - Envelope universal: { data, as_of }. O caller recebe os DOIS.
//   - Auth: cookie de sessão HttpOnly (ADR-0019). Browser envia automático.
//     credentials: "include" garante que cookies vão também em chamadas
//     com base diferente da página (ex.: /session).

const BASE = import.meta.env.VITE_ADMIN_API_BASE || "/admin/api";
const SESSION_BASE = import.meta.env.VITE_SESSION_BASE || "/session";

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

export interface SessionUser {
  id: string;
  email_address: string;
  municipality: { id: string; name: string; uf: string | null } | null;
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
    let body: unknown = null;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, body, `${res.status} on ${input}`);
  }

  // 204 No Content
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

export async function login(email_address: string, password: string): Promise<SessionUser> {
  return jsonFetch<SessionUser>(SESSION_BASE, {
    method: "POST",
    body: JSON.stringify({ email_address, password })
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
