import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, listUnknownChannels: vi.fn() };
});

import { listUnknownChannels, ApiError, type UnknownChannel } from "../../lib/api";
import { UnknownChannels } from "./UnknownChannels";
import { fmtDateTime } from "../../lib/format";

const mocked = vi.mocked(listUnknownChannels);

function renderScreen(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const ROWS: UnknownChannel[] = [
  {
    phone_number_id: "111222333",
    display_phone_number: "+55 41 3333-4444",
    hits: 42,
    first_seen_at: "2026-09-20T12:00:00Z",
    last_seen_at: "2026-09-27T09:30:00Z"
  },
  {
    phone_number_id: "999888777",
    display_phone_number: null,
    hits: 3,
    first_seen_at: "2026-09-25T08:00:00Z",
    last_seen_at: "2026-09-26T18:15:00Z"
  }
];

describe("UnknownChannels", () => {
  // Chaves: um beforeEach que devolve função vira teardown no vitest — e a
  // função devolvida por mockReset() é o próprio mock.
  beforeEach(() => { mocked.mockReset(); });
  afterEach(() => { cleanup(); });

  it("lists each unknown phone_number_id with display number, hits and pt-BR timestamps", async () => {
    mocked.mockResolvedValue(ROWS);
    renderScreen(<UnknownChannels />);

    expect(await screen.findByText("111222333")).toBeTruthy();
    expect(screen.getByText("999888777")).toBeTruthy();
    expect(screen.getByText("+55 41 3333-4444")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText(fmtDateTime("2026-09-20T12:00:00Z"))).toBeTruthy();
    expect(screen.getByText(fmtDateTime("2026-09-27T09:30:00Z"))).toBeTruthy();
    expect(fmtDateTime("2026-09-27T09:30:00Z")).toBe("27/09/2026, 06:30");
  });

  it("keeps the server order (last_seen_at desc)", async () => {
    mocked.mockResolvedValue(ROWS);
    renderScreen(<UnknownChannels />);

    await screen.findByText("111222333");
    const text = document.body.textContent ?? "";
    expect(text.indexOf("111222333")).toBeLessThan(text.indexOf("999888777"));
  });

  it("shows an em dash when the display number is null", async () => {
    mocked.mockResolvedValue([ ROWS[1] ]);
    renderScreen(<UnknownChannels />);

    await screen.findByText("999888777");
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("explains what the list means", async () => {
    mocked.mockResolvedValue([]);
    renderScreen(<UnknownChannels />);

    expect(await screen.findByText(/sem canal registrado/i)).toBeTruthy();
    expect(screen.getByText(/Registrar canal/)).toBeTruthy();
  });

  it("shows the empty state when nothing unknown arrived", async () => {
    mocked.mockResolvedValue([]);
    renderScreen(<UnknownChannels />);

    expect(await screen.findByText("Nenhum número desconhecido recebido.")).toBeTruthy();
  });

  it("shows the error state when the request fails", async () => {
    mocked.mockRejectedValue(new ApiError(500, "", "500 on /unknown_channels"));
    renderScreen(<UnknownChannels />);

    expect(await screen.findByText("Falha ao carregar")).toBeTruthy();
    expect(screen.getByText("500 on /unknown_channels")).toBeTruthy();
    expect(screen.queryByText("Nenhum número desconhecido recebido.")).toBeNull();
  });
});
