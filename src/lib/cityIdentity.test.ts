import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError } from "./api";
import { updateCityIdentity, checkCoatOfArmsFile, describeIdentityError } from "./cityIdentity";

function file(type: string, size = 1000) {
  const f = new File([new Uint8Array(size)], "b", { type });
  return f;
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("updateCityIdentity", () => {
  it("envia FormData sem Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ city: { id: "c1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const f = file("image/png");
    const city = await updateCityIdentity("c1", { healthDepartmentName: "Secretaria", coatOfArms: f });
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/cities/c1/identity");
    expect(init.method).toBe("PATCH");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeInstanceOf(FormData);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
    expect(init.body.get("health_department_name")).toBe("Secretaria");
    expect(init.body.get("coat_of_arms")).toBeInstanceOf(File);
    expect(init.body.has("remove_coat_of_arms")).toBe(false);
    expect(city).toEqual({ id: "c1" });
  });

  it("só manda o que foi pedido; remoção vai como 'true'; nome vazio limpa", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ city: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await updateCityIdentity("c1", { healthDepartmentName: "", removeCoatOfArms: true });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("health_department_name")).toBe("");
    expect(body.get("remove_coat_of_arms")).toBe("true");
    expect(body.has("coat_of_arms")).toBe(false);
  });

  it("lança ApiError com o corpo em resposta não ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "too_large" }), { status: 422 })));
    const err = await updateCityIdentity("c1", { removeCoatOfArms: true }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(describeIdentityError(err)).toBe("Até 256 KB.");
  });
});

describe("describeIdentityError", () => {
  it("traduz os códigos do api", () => {
    const mk = (error: string) => new ApiError(422, { error }, "x");
    expect(describeIdentityError(mk("invalid_format"))).toBe("Use PNG ou WebP.");
    expect(describeIdentityError(mk("invalid_dimensions"))).toBe("Entre 128 e 1024 px.");
    expect(describeIdentityError(mk("invalid_health_department_name"))).toBe("Até 120 caracteres.");
  });
});

describe("checkCoatOfArmsFile", () => {
  function bitmap(w: number, h: number) {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: w, height: h, close: vi.fn() }));
  }
  it("recusa SVG", async () => {
    bitmap(512, 512);
    expect(await checkCoatOfArmsFile(file("image/svg+xml"))).toBe("Use PNG ou WebP.");
  });
  it("recusa mais de 256 KB", async () => {
    bitmap(512, 512);
    expect(await checkCoatOfArmsFile(file("image/png", 262_145))).toBe("Até 256 KB.");
  });
  it("recusa lado menor de 127 px e lado maior > 1024", async () => {
    bitmap(127, 400);
    expect(await checkCoatOfArmsFile(file("image/png"))).toBe("Entre 128 e 1024 px.");
    bitmap(1025, 600);
    expect(await checkCoatOfArmsFile(file("image/png"))).toBe("Entre 128 e 1024 px.");
  });
  it("aceita PNG 512 e WebP no limite", async () => {
    bitmap(512, 512);
    expect(await checkCoatOfArmsFile(file("image/png"))).toBeNull();
    bitmap(1024, 128);
    expect(await checkCoatOfArmsFile(file("image/webp", 262_144))).toBeNull();
  });
  it("imagem ilegível vira formato inválido", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("x")));
    expect(await checkCoatOfArmsFile(file("image/png"))).toBe("Use PNG ou WebP.");
  });
});
