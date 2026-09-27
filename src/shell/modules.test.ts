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
