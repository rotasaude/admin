import { describe, it, expect } from "vitest";
import { NAV_GROUPS } from "./modules";

describe("NAV_GROUPS", () => {
  const setup = NAV_GROUPS.find((g) => g.label === "Setup")!;
  const item = setup.items.find((i) => i.id === "unknown_channels");

  it("lists Números desconhecidos in the Setup group", () => {
    expect(item?.label).toBe("Números desconhecidos");
  });

  it("shows it to operators only", () => {
    expect(item?.visible?.({ operator: true, memberships: [] })).toBe(true);
    expect(item?.visible?.({ operator: false, memberships: [ { role: "admin" } ] })).toBe(false);
  });
});

describe("NAV_GROUPS analytics", () => {
  const group = NAV_GROUPS.find((g) => g.label === "Analytics");
  const item = group?.items.find((i) => i.id === "city_analytics");

  it("lists Analytics das cidades in its own group", () => {
    expect(item?.label).toBe("Analytics das cidades");
  });

  it("shows it to operators only", () => {
    expect(item?.visible?.({ operator: true, memberships: [] })).toBe(true);
    expect(item?.visible?.({ operator: false, memberships: [ { role: "municipal_admin" } ] })).toBe(false);
  });
});

describe("NAV_GROUPS e-SUS", () => {
  const group = NAV_GROUPS.find((g) => g.label === "e-SUS");
  const item = group?.items.find((i) => i.id === "city_production");

  it("lists Produção das cidades in its own group", () => {
    expect(item?.label).toBe("Produção das cidades");
  });

  it("shows it to operators only", () => {
    expect(item?.visible?.({ operator: true, memberships: [] })).toBe(true);
    expect(item?.visible?.({ operator: false, memberships: [ { role: "municipal_admin" } ] })).toBe(false);
  });
});
