import { describe, it, expect } from "vitest";
import { publishedCount } from "./protocols";
import type { ProtocolRow } from "./types";

// O KPI "Publicados" contava só `status === "published"`. Quando a leitura do
// api passou a distinguir `active` (a versão EM USO) de `published` (publicada,
// ainda não ativada), o KPI passou a subcontar em silêncio — justamente a
// versão que responde triagem deixava de aparecer. Este teste é a guarda.
function row(status: string): ProtocolRow {
  return {
    id: "dengue", name: "dengue", version: "1", status,
    createdBy: null, publishedBy: null, fourEyes: null,
    publishedAt: null, retiredAt: null, schema: "ok", linter: "ok", gates: "ok"
  } as ProtocolRow;
}

describe("publishedCount", () => {
  it("conta published e active — as duas estão publicadas", () => {
    expect(publishedCount([ row("published"), row("active") ])).toBe(2);
  });

  it("não conta rascunho, em revisão nem aposentada", () => {
    expect(publishedCount([ row("draft"), row("in_review"), row("retired") ])).toBe(0);
  });

  it("conta só as publicadas numa lista mista", () => {
    expect(publishedCount([ row("draft"), row("published"), row("active"), row("retired") ])).toBe(2);
  });

  it("lista vazia é zero", () => {
    expect(publishedCount([])).toBe(0);
  });
});
