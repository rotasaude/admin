import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../lib/cityIdentity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/cityIdentity")>();
  return { ...actual, updateCityIdentity: vi.fn(), checkCoatOfArmsFile: vi.fn() };
});

import { ApiError } from "../../lib/api";
import { updateCityIdentity, checkCoatOfArmsFile } from "../../lib/cityIdentity";
import type { CityDetail } from "../../lib/types";
import { CityIdentityForm } from "./CityIdentityForm";

const updateMock = vi.mocked(updateCityIdentity);
const checkMock = vi.mocked(checkCoatOfArmsFile);

const CITY = {
  id: "c1", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active",
  health_department_name: "Secretaria Municipal da Saúde", coat_of_arms_url: null
} as unknown as CityDetail;

const png = () => new File([ new Uint8Array(10) ], "brasao.png", { type: "image/png" });

function pick(f: File) {
  fireEvent.change(screen.getByLabelText(/^Brasão/), { target: { files: [ f ] } });
}

describe("CityIdentityForm", () => {
  beforeEach(() => {
    updateMock.mockReset();
    checkMock.mockReset();
    checkMock.mockResolvedValue(null);
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(cleanup);

  it("mostra a prévia do arquivo escolhido, troca, remove e salva o nome do órgão", async () => {
    const onSaved = vi.fn();
    const saved = { ...CITY, health_department_name: "SMS Curitiba" } as CityDetail;
    updateMock.mockResolvedValue(saved);
    render(<CityIdentityForm city={CITY} onSaved={onSaved} />);

    expect((screen.getByLabelText(/^Nome do órgão/) as HTMLInputElement).value).toBe("Secretaria Municipal da Saúde");
    expect(screen.queryByRole("img", { name: /prévia/i })).toBeNull();

    pick(png());
    const img = await screen.findByRole("img", { name: /prévia/i });
    expect(img.getAttribute("src")).toBe("blob:preview");

    fireEvent.click(screen.getByRole("button", { name: "Remover brasão" }));
    expect(screen.queryByRole("img", { name: /prévia/i })).toBeNull();

    const f = png();
    pick(f);
    await screen.findByRole("img", { name: /prévia/i });
    fireEvent.change(screen.getByLabelText(/^Nome do órgão/), { target: { value: "SMS Curitiba" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(updateMock).toHaveBeenCalledWith("c1", { healthDepartmentName: "SMS Curitiba", coatOfArms: f });
  });

  it("remover um brasão já salvo manda removeCoatOfArms", async () => {
    updateMock.mockResolvedValue(CITY);
    render(<CityIdentityForm city={{ ...CITY, coat_of_arms_url: "/city_identity/coat_of_arms?v=abc" }} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover brasão" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith("c1", { removeCoatOfArms: true }));
  });

  it("arquivo recusado na checagem local não é aceito", async () => {
    checkMock.mockResolvedValue("Use PNG ou WebP.");
    render(<CityIdentityForm city={CITY} onSaved={vi.fn()} />);
    pick(png());
    expect((await screen.findByRole("alert")).textContent).toBe("Use PNG ou WebP.");
    expect(screen.queryByRole("img", { name: /prévia/i })).toBeNull();
  });

  it("422 do api aparece como mensagem e não some o arquivo escolhido", async () => {
    updateMock.mockRejectedValue(new ApiError(422, { error: "invalid_dimensions" }, "x"));
    render(<CityIdentityForm city={CITY} onSaved={vi.fn()} />);
    pick(png());
    await screen.findByRole("img", { name: /prévia/i });
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Entre 128 e 1024 px.");
    expect(screen.getByRole("img", { name: /prévia/i })).toBeTruthy();
  });

  it("sem mudança não chama o api", () => {
    render(<CityIdentityForm city={CITY} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));
    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Nada mudou.");
  });

  it("brasão salvo aparece como imagem pela rota do console, com o v do checksum", () => {
    render(<CityIdentityForm city={{ ...CITY, coat_of_arms_url: "/city_identity/coat_of_arms?v=abc123" }} onSaved={vi.fn()} />);
    const img = screen.getByRole("img", { name: /brasão salvo/i });
    expect(img.getAttribute("src")).toBe("/cities/c1/coat_of_arms?v=abc123");
    expect(screen.queryByText("Brasão cadastrado.")).toBeNull();
  });

  it("sem coat_of_arms_url não há imagem salva", () => {
    render(<CityIdentityForm city={CITY} onSaved={vi.fn()} />);
    expect(screen.queryByRole("img", { name: /brasão salvo/i })).toBeNull();
  });

  it("erro ao carregar a imagem salva cai no texto", () => {
    render(<CityIdentityForm city={{ ...CITY, coat_of_arms_url: "/city_identity/coat_of_arms?v=abc123" }} onSaved={vi.fn()} />);
    fireEvent.error(screen.getByRole("img", { name: /brasão salvo/i }));
    expect(screen.queryByRole("img", { name: /brasão salvo/i })).toBeNull();
    expect(screen.getByText("Brasão cadastrado.")).toBeTruthy();
  });
});
