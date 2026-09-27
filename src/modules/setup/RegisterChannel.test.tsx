import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, listCities: vi.fn(), registerCityChannel: vi.fn() };
});

import { listCities, registerCityChannel, ApiError } from "../../lib/api";
import type { CityRow } from "../../lib/types";
import { RegisterChannel } from "./RegisterChannel";

const citiesMock = vi.mocked(listCities);
const registerMock = vi.mocked(registerCityChannel);

const CITIES: CityRow[] = [
  { id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1", created_at: "2026-09-01T00:00:00Z" },
  { id: "c-new", slug: "nova", name: "Nova", uf: "SP", status: "provisioning", schema_version: null, created_at: "2026-09-02T00:00:00Z" }
];

const TOKEN = "EAAG-secret-token-123";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><RegisterChannel /></QueryClientProvider>);
}

function input(label: RegExp): HTMLInputElement | HTMLSelectElement {
  return screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement;
}

async function fillAndSubmit() {
  await screen.findByRole("option", { name: "Curitiba · PR" });
  fireEvent.change(input(/^Cidade/), { target: { value: "c-cwb" } });
  fireEvent.change(input(/^Phone number ID/), { target: { value: "111222333" } });
  fireEvent.change(input(/^WABA ID/), { target: { value: "waba-9" } });
  fireEvent.change(input(/^Número exibido/), { target: { value: "+554133334444" } });
  fireEvent.change(input(/^Token de acesso/), { target: { value: TOKEN } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar canal" }));
}

describe("RegisterChannel", () => {
  beforeEach(() => {
    citiesMock.mockReset();
    registerMock.mockReset();
    citiesMock.mockResolvedValue(CITIES);
  });
  afterEach(() => { cleanup(); });

  it("offers only active cities", async () => {
    renderScreen();
    await screen.findByRole("option", { name: "Curitiba · PR" });
    expect(screen.queryByRole("option", { name: /Nova/ })).toBeNull();
  });

  it("sends the typed values to registerCityChannel for the chosen city and shows success", async () => {
    registerMock.mockResolvedValue({ id: "ch-1", phone_number_id: "111222333", display_phone_number: "+554133334444", active: true });
    renderScreen();
    await fillAndSubmit();

    expect(await screen.findByText(/Canal registrado/)).toBeTruthy();
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith("c-cwb", {
      phone_number_id: "111222333",
      waba_id: "waba-9",
      display_phone_number: "+554133334444",
      access_token: TOKEN
    });
  });

  it("never renders the access token back after success, even on 'Registrar outro canal'", async () => {
    registerMock.mockResolvedValue({ id: "ch-1", phone_number_id: "111222333", display_phone_number: "+554133334444", active: true });
    const { container } = renderScreen();
    await fillAndSubmit();
    await screen.findByText(/Canal registrado/);

    expect(container.innerHTML).not.toContain(TOKEN);

    fireEvent.click(screen.getByRole("button", { name: "Registrar outro canal" }));
    const tokenField = await waitFor(() => input(/^Token de acesso/) as HTMLInputElement);
    expect(tokenField.type).toBe("password");
    expect(tokenField.value).toBe("");
    expect(container.innerHTML).not.toContain(TOKEN);
  });

  it("does not call the API without a city and asks for one", async () => {
    renderScreen();
    await screen.findByRole("option", { name: "Curitiba · PR" });
    fireEvent.click(screen.getByRole("button", { name: "Registrar canal" }));

    expect((await screen.findByRole("alert")).textContent).toBe("selecione uma cidade");
    expect(registerMock).not.toHaveBeenCalled();
  });

  it.each([
    [ "404 → unknown city", new ApiError(404, {}, "404"), "cidade não encontrada" ],
    [ "422 city_not_servable", new ApiError(422, { error: "city_not_servable", message: "x" }, "422"), "a cidade não está ativa" ],
    [ "422 with server message", new ApiError(422, { error: "invalid", message: "access_token vazio" }, "422"), "access_token vazio" ],
    [ "422 without message", new ApiError(422, {}, "422"), "dados inválidos" ],
    [ "network failure", new Error("network down"), "network down" ]
  ])("shows the mapped error message (%s) and keeps the form", async (_name, err, message) => {
    registerMock.mockRejectedValue(err);
    renderScreen();
    await fillAndSubmit();

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(screen.queryByText(/Canal registrado/)).toBeNull();
    expect((input(/^Phone number ID/) as HTMLInputElement).value).toBe("111222333");
  });

  it("shows the empty state when no city is active", async () => {
    citiesMock.mockResolvedValue([ CITIES[1] ]);
    renderScreen();
    expect(await screen.findByText("Nenhuma cidade ativa")).toBeTruthy();
  });
});
