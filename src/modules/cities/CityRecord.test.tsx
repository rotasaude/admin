import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, listCities: vi.fn(), getCity: vi.fn(), createCityGrant: vi.fn() };
});

import { listCities, getCity, ApiError } from "../../lib/api";
import type { CityDetail, CityRow } from "../../lib/types";
import { Cities } from "../Cities";

const citiesMock = vi.mocked(listCities);
const cityMock = vi.mocked(getCity);

const CITIES: CityRow[] = [
  { id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1",
    created_at: "2026-09-01T00:00:00Z", record_mode: "off" },
  { id: "c-mga", slug: "maringa", name: "Maringá", uf: "PR", status: "active", schema_version: "1",
    created_at: "2026-09-02T00:00:00Z", record_mode: "integrated" }
];

const DETAIL: CityDetail = {
  id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1",
  time_zone: "America/Sao_Paulo", created_at: "2026-09-01T00:00:00Z",
  record_mode: "off", ibge_code: null, pec_url: null, city_reachable: true,
  features: [
    { key: "ledi_export", enabled: false, usable: false,
      missing: [ "record_mode_off", "pec_url_missing", "ibge_code_missing", "credential_missing:ledi" ] },
    { key: "cadsus_lookup", enabled: true, usable: true, missing: [] }
  ]
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Cities /></QueryClientProvider>);
}

async function openRecord() {
  fireEvent.click(await screen.findByRole("button", { name: "Ficha de Curitiba" }));
}

describe("City record (read-only switches)", () => {
  beforeEach(() => {
    citiesMock.mockReset();
    cityMock.mockReset();
    citiesMock.mockResolvedValue(CITIES);
    cityMock.mockResolvedValue(DETAIL);
  });
  afterEach(() => { cleanup(); });

  it("lists the record mode of each city", async () => {
    renderScreen();
    expect(await screen.findByText("Desligado")).toBeTruthy();
    expect(screen.getByText("Integrado ao PEC")).toBeTruthy();
    expect(screen.getByText("Prontuário")).toBeTruthy();
  });

  it("opens the record of the chosen city with its switches, read-only", async () => {
    renderScreen();
    await openRecord();

    expect(await screen.findByRole("heading", { name: "Curitiba · PR" })).toBeTruthy();
    expect(cityMock).toHaveBeenCalledWith("c-cwb");

    const ledi = await screen.findByRole("listitem", { name: "Exportação para o e-SUS (LEDI)" });
    expect(ledi.textContent).toContain("desligado");
    expect(ledi.textContent).toContain(
      "falta: modo de prontuário desligado (aqui); endereço do PEC (aqui); código IBGE (aqui); " +
      "credencial do PEC (a cidade cadastra em Integrações)"
    );
    const cadsus = screen.getByRole("listitem", { name: "Consulta ao CADSUS" });
    expect(cadsus.textContent).toContain("ligado · utilizável");
    expect(cadsus.textContent).not.toContain("falta:");

    expect(screen.getByText(/Quem liga e desliga os interruptores é o mantenedor, no maintenance/)).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: /ligar|desligar/i })).toBeNull();
  });

  it("enabled but not usable says what is still missing", async () => {
    cityMock.mockResolvedValue({
      ...DETAIL,
      features: [ { key: "ledi_export", enabled: true, usable: false, missing: [ "credential_unauthorized:ledi" ] } ]
    });
    renderScreen();
    await openRecord();

    const ledi = await screen.findByRole("listitem", { name: "Exportação para o e-SUS (LEDI)" });
    expect(ledi.textContent).toContain("ligado · não utilizável");
    expect(ledi.textContent).toContain("credencial do PEC recusada (a cidade troca em Integrações)");
  });

  it("unknown switch and unknown missing code appear raw", async () => {
    cityMock.mockResolvedValue({
      ...DETAIL,
      features: [ { key: "rnds_export", enabled: false, usable: false, missing: [ "something_new" ] } ]
    });
    renderScreen();
    await openRecord();

    const item = await screen.findByRole("listitem", { name: "rnds_export" });
    expect(item.textContent).toContain("something_new");
  });

  it("an api without features shows an explained empty state", async () => {
    cityMock.mockResolvedValue({ ...DETAIL, features: [] });
    renderScreen();
    await openRecord();

    expect(await screen.findByText("Nenhum interruptor informado.")).toBeTruthy();
  });

  it("goes back to the list", async () => {
    renderScreen();
    await openRecord();
    fireEvent.click(await screen.findByRole("button", { name: "Voltar para Cidades" }));

    expect(await screen.findByRole("button", { name: "Ficha de Maringá" })).toBeTruthy();
  });

  it("shows the error state when the record fails to load", async () => {
    cityMock.mockRejectedValue(new ApiError(500, "", "500 on /cities/c-cwb"));
    renderScreen();
    await openRecord();

    expect(await screen.findByText("Falha ao carregar")).toBeTruthy();
    const table = screen.queryByRole("table");
    expect(table).toBeNull();
    expect(within(document.body).getByText("500 on /cities/c-cwb")).toBeTruthy();
  });
});
