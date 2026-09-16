import { describe, it, expect } from "vitest";
import { describeChannelError } from "./channels";
import { ApiError } from "./api";

describe("describeChannelError", () => {
  it("describes a 404 as an unknown city", () => {
    expect(describeChannelError(new ApiError(404, {}, "404"))).toBe("cidade não encontrada");
  });

  it("describes a 422 city_not_servable as the city not being active", () => {
    const err = new ApiError(422, { error: "city_not_servable", message: "cidade x não está ativa" }, "422");
    expect(describeChannelError(err)).toBe("a cidade não está ativa");
  });

  it("uses the server message for any other 422", () => {
    const err = new ApiError(422, { error: "invalid", message: "access_token vazio" }, "422");
    expect(describeChannelError(err)).toBe("access_token vazio");
  });

  it("falls back to a generic message when the 422 body has none", () => {
    const err = new ApiError(422, {}, "422");
    expect(describeChannelError(err)).toBe("dados inválidos");
  });

  it("falls back to the error's own message for anything else", () => {
    expect(describeChannelError(new Error("network down"))).toBe("network down");
  });
});
