import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual, listCities: vi.fn(), getCity: vi.fn(), updateCityRecordSettings: vi.fn(), createCityGrant: vi.fn()
  };
});

import { listCities, getCity, updateCityRecordSettings, ApiError } from "../../lib/api";
import type { CityDetail, CityRow } from "../../lib/types";
import { FIELD_PROBLEMS, IBGE_LOCKED_TEXT } from "../../lib/recordSettings";
import { Cities } from "../Cities";
import { RecordSettingsForm } from "./RecordSettingsForm";

const citiesMock = vi.mocked(listCities);
const cityMock = vi.mocked(getCity);
const updateMock = vi.mocked(updateCityRecordSettings);

const CITIES: CityRow[] = [
  { id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1",
    created_at: "2026-09-01T00:00:00Z", record_mode: "off" }
];

const DETAIL: CityDetail = {
  id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1",
  time_zone: "America/Sao_Paulo", created_at: "2026-09-01T00:00:00Z",
  record_mode: "off", ibge_code: null, pec_url: null, city_reachable: true,
  features: [
    { key: "ledi_export", enabled: false, usable: false,
      missing: [ "record_mode_off", "pec_url_missing", "ibge_code_missing", "credential_missing:ledi" ] },
    { key: "cadsus_lookup", enabled: false, usable: false, missing: [ "credential_missing:cadsus" ] }
  ]
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Cities /></QueryClientProvider>);
}

function field(label: RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement;
}

async function openRecord() {
  fireEvent.click(await screen.findByRole("button", { name: "Ficha de Curitiba" }));
  await screen.findByLabelText(/^Modo de prontuário/);
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
}

describe("RecordSettingsForm", () => {
  beforeEach(() => {
    citiesMock.mockReset();
    cityMock.mockReset();
    updateMock.mockReset();
    citiesMock.mockResolvedValue(CITIES);
    cityMock.mockResolvedValue(DETAIL);
  });
  afterEach(() => { cleanup(); });

  it("opens with the current values", async () => {
    cityMock.mockResolvedValue({ ...DETAIL, record_mode: "integrated", ibge_code: "4106902", pec_url: "https://pec.a.gov.br" });
    renderScreen();
    await openRecord();

    expect(field(/^Modo de prontuário/).value).toBe("integrated");
    expect(field(/^Código IBGE/).value).toBe("4106902");
    expect(field(/^Endereço do PEC/).value).toBe("https://pec.a.gov.br");
  });

  it("changing only the IBGE code saves without confirmation and sends only that field", async () => {
    updateMock.mockResolvedValue({ ...DETAIL, ibge_code: "4106902" });
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Código IBGE/), { target: { value: "4106902" } });
    save();

    expect(await screen.findByText("Salvo.")).toBeTruthy();
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith("c-cwb", { ibge_code: "4106902" });
    expect(screen.queryByRole("group", { name: "Confirmar mudança de modo" })).toBeNull();
  });

  it("changing the mode asks for confirmation and only sends after confirming", async () => {
    updateMock.mockResolvedValue({ ...DETAIL, record_mode: "record" });
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Modo de prontuário/), { target: { value: "record" } });
    save();

    const confirm = await screen.findByRole("group", { name: "Confirmar mudança de modo" });
    expect(confirm.textContent).toContain("de \"Desligado\" para \"Prontuário Rota Saúde\"");
    expect(confirm.textContent).toContain("o repasse da cidade passa a depender das fichas enviadas");
    expect(updateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar mudança" }));

    expect(await screen.findByText("Salvo.")).toBeTruthy();
    expect(updateMock).toHaveBeenCalledWith("c-cwb", { record_mode: "record" });
    expect(screen.queryByRole("group", { name: "Confirmar mudança de modo" })).toBeNull();
  });

  it("cancel sends nothing and keeps the chosen mode", async () => {
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Modo de prontuário/), { target: { value: "integrated" } });
    save();
    await screen.findByRole("group", { name: "Confirmar mudança de modo" });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("group", { name: "Confirmar mudança de modo" })).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
    expect(field(/^Modo de prontuário/).value).toBe("integrated");
  });

  it("mode back to the original: no confirmation and nothing sent", async () => {
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Modo de prontuário/), { target: { value: "record" } });
    fireEvent.change(field(/^Modo de prontuário/), { target: { value: "off" } });
    save();

    expect(await screen.findByText("Nada mudou.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Confirmar mudança de modo" })).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("PEC with user and password is refused before the API and never echoed", async () => {
    const { container } = renderScreen();
    await openRecord();

    fireEvent.change(field(/^Endereço do PEC/), { target: { value: "https://admin:segredo@pec.curitiba.pr.gov.br" } });
    save();

    expect(await screen.findByText(FIELD_PROBLEMS.pec_url)).toBeTruthy();
    expect(updateMock).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("segredo");
  });

  it("a short IBGE code is refused before the API", async () => {
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Código IBGE/), { target: { value: "41069" } });
    save();

    expect(await screen.findByText(FIELD_PROBLEMS.ibge_code)).toBeTruthy();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it.each([
    [ "city_unreachable", new ApiError(503, { error: "city_unreachable" }, "503"), "o banco da cidade não respondeu; o código IBGE não foi gravado — tente de novo" ],
    [ "invalid_ibge_code", new ApiError(422, { error: "invalid_ibge_code" }, "422"), "o código IBGE tem 7 dígitos" ],
    [ "invalid_pec_url", new ApiError(422, { error: "invalid_pec_url" }, "422"), FIELD_PROBLEMS.pec_url ],
    [ "invalid_city", new ApiError(422, { error: "invalid_city" }, "422"), "o cadastro da cidade tem outro dado inválido; nada foi gravado" ],
    [ "invalid_record_mode", new ApiError(422, { error: "invalid_record_mode" }, "422"), "modo de prontuário inválido" ],
    [ "404", new ApiError(404, { error: "not_found" }, "404"), "cidade não encontrada" ],
    [ "network", new Error("network down"), "network down" ]
  ])("shows the refusal (%s) and keeps the form", async (_name, err, message) => {
    updateMock.mockRejectedValue(err);
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Código IBGE/), { target: { value: "4106902" } });
    save();

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(screen.queryByText("Salvo.")).toBeNull();
    expect(field(/^Código IBGE/).value).toBe("4106902");
  });

  it("unreachable city: IBGE locked, mode and PEC still save without it", async () => {
    cityMock.mockResolvedValue({ ...DETAIL, ibge_code: null, city_reachable: false });
    updateMock.mockResolvedValue({ ...DETAIL, ibge_code: null, city_reachable: false, pec_url: "https://pec.a.gov.br" });
    renderScreen();
    await openRecord();

    const ibge = field(/^Código IBGE/) as HTMLInputElement;
    expect(ibge.disabled).toBe(true);
    expect(screen.getByText(IBGE_LOCKED_TEXT)).toBeTruthy();

    fireEvent.change(field(/^Endereço do PEC/), { target: { value: "https://pec.a.gov.br" } });
    save();

    expect(await screen.findByText("Salvo.")).toBeTruthy();
    expect(updateMock).toHaveBeenCalledWith("c-cwb", { pec_url: "https://pec.a.gov.br" });
  });

  it("after saving, the switches follow the server and the city list is refreshed", async () => {
    citiesMock.mockReset();
    citiesMock
      .mockResolvedValueOnce(CITIES)
      .mockResolvedValue([ { ...CITIES[0], record_mode: "record" } ]);
    updateMock.mockResolvedValue({
      ...DETAIL,
      record_mode: "record", ibge_code: "4106902", pec_url: "https://pec.curitiba.pr.gov.br",
      features: [
        { key: "ledi_export", enabled: false, usable: false, missing: [ "credential_missing:ledi" ] },
        DETAIL.features[1]
      ]
    });
    renderScreen();
    await openRecord();

    fireEvent.change(field(/^Modo de prontuário/), { target: { value: "record" } });
    fireEvent.change(field(/^Código IBGE/), { target: { value: "4106902" } });
    fireEvent.change(field(/^Endereço do PEC/), { target: { value: "https://pec.curitiba.pr.gov.br" } });
    save();
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar mudança" }));
    await screen.findByText("Salvo.");

    expect(updateMock).toHaveBeenCalledWith("c-cwb", {
      record_mode: "record", ibge_code: "4106902", pec_url: "https://pec.curitiba.pr.gov.br"
    });
    const ledi = screen.getByRole("listitem", { name: "Exportação para o e-SUS (LEDI)" });
    expect(ledi.textContent).not.toContain("endereço do PEC");
    expect(ledi.textContent).not.toContain("modo de prontuário desligado");
    expect(ledi.textContent).toContain("credencial do PEC (a cidade cadastra em Integrações)");

    fireEvent.click(screen.getByRole("button", { name: "Voltar para Cidades" }));
    expect(await screen.findByText("Prontuário Rota Saúde")).toBeTruthy();
    expect(citiesMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  describe("baseline across city prop changes", () => {
    const DOWN: CityDetail = { ...DETAIL, ibge_code: null, city_reachable: false };
    const UP: CityDetail = { ...DETAIL, ibge_code: "4106902", city_reachable: true };

    it("a clean form resyncs to refreshed data and then sends only the PEC change", async () => {
      updateMock.mockResolvedValue({ ...UP, pec_url: "https://pec.a.gov.br" });
      const onSaved = vi.fn();
      const view = render(<RecordSettingsForm city={DOWN} onSaved={onSaved} />);
      expect((field(/^Código IBGE/) as HTMLInputElement).disabled).toBe(true);

      view.rerender(<RecordSettingsForm city={UP} onSaved={onSaved} />);
      const ibge = field(/^Código IBGE/) as HTMLInputElement;
      expect(ibge.disabled).toBe(false);
      expect(ibge.value).toBe("4106902");

      fireEvent.change(field(/^Endereço do PEC/), { target: { value: "https://pec.a.gov.br" } });
      save();

      expect(await screen.findByText("Salvo.")).toBeTruthy();
      expect(updateMock).toHaveBeenCalledWith("c-cwb", { pec_url: "https://pec.a.gov.br" });
    });

    it("a dirty form keeps its baseline: IBGE stays locked and never goes in the patch", async () => {
      updateMock.mockResolvedValue({ ...DOWN, pec_url: "https://pec.a.gov.br" });
      const onSaved = vi.fn();
      const view = render(<RecordSettingsForm city={DOWN} onSaved={onSaved} />);
      fireEvent.change(field(/^Endereço do PEC/), { target: { value: "https://pec.a.gov.br" } });

      view.rerender(<RecordSettingsForm city={UP} onSaved={onSaved} />);
      expect((field(/^Código IBGE/) as HTMLInputElement).disabled).toBe(true);
      expect(field(/^Endereço do PEC/).value).toBe("https://pec.a.gov.br");

      save();

      expect(await screen.findByText("Salvo.")).toBeTruthy();
      expect(updateMock).toHaveBeenCalledWith("c-cwb", { pec_url: "https://pec.a.gov.br" });
    });
  });
});
