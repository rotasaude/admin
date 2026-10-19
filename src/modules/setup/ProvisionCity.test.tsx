import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, createCity: vi.fn() };
});
vi.mock("../../lib/cityIdentity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/cityIdentity")>();
  return { ...actual, updateCityIdentity: vi.fn(), checkCoatOfArmsFile: vi.fn() };
});

import { createCity, ApiError } from "../../lib/api";
import { updateCityIdentity, checkCoatOfArmsFile } from "../../lib/cityIdentity";
import { ProvisionCity } from "./ProvisionCity";

const createMock = vi.mocked(createCity);
const updateMock = vi.mocked(updateCityIdentity);
const checkMock = vi.mocked(checkCoatOfArmsFile);

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ProvisionCity /></QueryClientProvider>);
}

function fillRequired() {
  const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  set(/^Slug/, "curitiba");
  set(/^Nome$/, "Curitiba");
  set(/^UF/, "PR");
  set(/^Código IBGE/, "4106902");
  set(/^E-mail do administrador/, "admin@curitiba.pr.gov.br");
  set(/^E-mail de alerta/, "urgencia@curitiba.pr.gov.br");
}

const png = () => new File([ "x" ], "brasao.png", { type: "image/png" });

function fillIdentity() {
  fireEvent.change(screen.getByLabelText(/^Nome oficial do órgão de saúde/), { target: { value: "Secretaria Municipal da Saúde" } });
  fireEvent.change(screen.getByLabelText(/^Brasão/), { target: { files: [ png() ] } });
}

beforeEach(() => {
  createMock.mockReset().mockResolvedValue({ id: "c-new" });
  updateMock.mockReset().mockResolvedValue({} as never);
  checkMock.mockReset().mockResolvedValue(null);
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe("ProvisionCity — identidade", () => {
  it("com órgão e brasão: chama createCity e depois updateCityIdentity com o id devolvido", async () => {
    renderScreen();
    fillRequired();
    fillIdentity();
    await waitFor(() => expect(checkMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Provisionar cidade" }));
    await screen.findByText(/Cidade registrada/);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith("c-new", expect.objectContaining({
      healthDepartmentName: "Secretaria Municipal da Saúde", coatOfArms: expect.any(File)
    }));
  });

  it("sem os campos opcionais: não chama updateCityIdentity", async () => {
    renderScreen();
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Provisionar cidade" }));
    await screen.findByText(/Cidade registrada/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("createCity ok e identidade falha: avisa e o botão reenvia só a identidade", async () => {
    updateMock.mockRejectedValueOnce(new ApiError(422, { error: "too_large" }, "x"));
    renderScreen();
    fillRequired();
    fillIdentity();
    await waitFor(() => expect(checkMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Provisionar cidade" }));
    await screen.findByText("Cidade criada, mas a identidade não foi salva.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(2));
    expect(createMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Cidade criada, mas a identidade não foi salva.")).toBeNull());
  });

  it("arquivo inválido bloqueia o envio antes de criar a cidade", async () => {
    checkMock.mockResolvedValue("Até 256 KB.");
    renderScreen();
    fillRequired();
    fireEvent.change(screen.getByLabelText(/^Brasão/), { target: { files: [ png() ] } });
    await screen.findByText("Até 256 KB.");
    fireEvent.click(screen.getByRole("button", { name: "Provisionar cidade" }));
    await Promise.resolve();
    expect(createMock).not.toHaveBeenCalled();
  });
});
