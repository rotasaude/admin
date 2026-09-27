// Fluxo de login do operador no host admin.*: senha → TOTP → sessão.
// Exercita Login + MfaChallenge + AuthProvider + api.ts reais; só o fetch é
// simulado, com as respostas do Operators::SessionsController.

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "../lib/auth";
import { Login } from "./Login";
import { MfaChallenge } from "./setup/MfaChallenge";

type Reply = { status: number; body?: unknown };

const OPERATOR = {
  id: "op-1",
  email_address: "ops@rotasaude.test",
  mfa_enrolled: true,
  operator: true,
  mfa_verified_at: "2026-09-27T12:00:00Z",
  memberships: []
};

let routes: Record<string, Reply[]>;
let fetchMock: ReturnType<typeof vi.fn>;

function reply({ status, body }: Reply): Response {
  const text = body === undefined ? "" : JSON.stringify(body);
  return new Response(status === 204 ? null : text, {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function on(method: string, path: string, ...replies: Reply[]) {
  routes[`${method} ${path}`] = replies;
}

function Gate() {
  const { state } = useAuth();
  if (state.kind === "loading") return <p>carregando</p>;
  if (state.kind === "anonymous") return <Login />;
  if (state.kind === "mfa_required") return <MfaChallenge />;
  return <p>logado como {state.user.email_address}</p>;
}

async function submitPassword() {
  fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: OPERATOR.email_address } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-longa-de-teste" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

async function submitCode(code: string) {
  fireEvent.change(await screen.findByLabelText("Código"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
}

describe("admin login flow", () => {
  beforeEach(() => {
    routes = {};
    on("GET", "/session", { status: 401, body: { error: "unauthorized" } });
    fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const key = `${method} ${new URL(input, "http://admin.localhost").pathname}`;
      const queue = routes[key];
      if (!queue || queue.length === 0) throw new Error(`unexpected fetch ${key}`);
      return reply(queue.length > 1 ? queue.shift()! : queue[0]);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves from the password step to the TOTP challenge", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();

    expect(await screen.findByLabelText("Código")).toBeTruthy();
    expect(screen.getByText(OPERATOR.email_address)).toBeTruthy();
  });

  it("logs in with the correct TOTP, sending the pending session_id", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    on("POST", "/session/challenge", { status: 200, body: OPERATOR });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();
    await submitCode("123 456");

    expect(await screen.findByText(`logado como ${OPERATOR.email_address}`)).toBeTruthy();
    const call = fetchMock.mock.calls.find(([ url ]) => String(url).endsWith("/session/challenge"))!;
    expect(JSON.parse(call[1].body)).toEqual({ session_id: "s-1", code: "123456" });
  });

  it("keeps the challenge open with a message on a wrong TOTP", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    on("POST", "/session/challenge", { status: 401, body: { error: "invalid_code" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();
    await submitCode("000000");

    expect((await screen.findByRole("alert")).textContent).toBe("Código inválido. Verifique seu autenticador.");
    expect(screen.getByRole("button", { name: "Verificar" })).toBeTruthy();
  });

  it("sends the operator back to the password step after too_many_attempts", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    on("POST", "/session/challenge", { status: 401, body: { error: "too_many_attempts" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();
    await submitCode("000000");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Muitos códigos errados/);
    expect(alert.textContent).toMatch(/entre de novo com e-mail e senha/);
    expect(screen.queryByRole("button", { name: "Verificar" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao login" }));
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
  });

  it("asks to log in again when the pending session expired", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    on("POST", "/session/challenge", { status: 401, body: { error: "invalid_session" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();
    await submitCode("123456");

    expect((await screen.findByRole("alert")).textContent).toMatch(/sessão de login expirou/);
    expect(screen.getByRole("button", { name: "Voltar ao login" })).toBeTruthy();
  });

  it("shows a rate-limit message when the challenge answers 429", async () => {
    on("POST", "/session", { status: 200, body: { mfa_required: true, session_id: "s-1" } });
    on("POST", "/session/challenge", { status: 429, body: { error: "too_many_requests" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();
    await submitCode("123456");

    expect((await screen.findByRole("alert")).textContent)
      .toBe("Muitas tentativas. Tente novamente em alguns minutos.");
  });

  it("explains mfa_enrollment_required and stays on the login screen", async () => {
    on("POST", "/session", { status: 403, body: { error: "mfa_enrollment_required" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/ainda não tem MFA cadastrado/);
    expect(alert.textContent).toMatch(/operator:create/);
    expect(screen.queryByLabelText("Código")).toBeNull();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
  });

  it("shows a rate-limit message when the password step answers 429", async () => {
    on("POST", "/session", { status: 429, body: { error: "too_many_requests" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();

    expect((await screen.findByRole("alert")).textContent)
      .toBe("Muitas tentativas. Tente novamente em alguns minutos.");
  });

  it("says the credentials are invalid on 401", async () => {
    on("POST", "/session", { status: 401, body: { error: "invalid_credentials" } });
    render(<AuthProvider><Gate /></AuthProvider>);

    await submitPassword();

    expect((await screen.findByRole("alert")).textContent).toBe("Credenciais inválidas.");
  });
});
