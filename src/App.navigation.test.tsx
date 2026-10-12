import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderModule, shellGroupsFor } from "./App";

type El = ReactElement<Record<string, (id?: string) => void>>;

describe("atalhos entre telas do console", () => {
  it.each([ [ "overview", "queues" ], [ "overview", "health" ], [ "overview", "events" ], [ "provision_city", "cities" ] ] as const)
  ("%s navega para %s", (screenId, target) => {
    const navigate = vi.fn();
    (renderModule(screenId, navigate) as El).props.onNavigate(target);
    expect(navigate).toHaveBeenCalledWith(target);
  });
});

describe("grupos do console", () => {
  it("operador vê Setup, Analytics e e-SUS", () => {
    const gs = shellGroupsFor({ operator: true, memberships: [] });
    expect(gs.map((g) => g.slug)).toEqual([ "setup", "analytics", "e-sus" ]);
    expect(gs[0].items.map((i) => i.id)).toEqual([ "cities", "provision_city", "register_channel", "unknown_channels" ]);
  });

  it("sem operador, nenhum grupo", () => {
    expect(shellGroupsFor({ operator: false, memberships: [] })).toEqual([]);
    expect(shellGroupsFor(null)).toEqual([]);
  });
});
