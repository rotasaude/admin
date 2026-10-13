// DataTable — tabela em CSS grid. Header mono uppercase. Linhas via render(row).
// `cols[*].w` aceita qualquer grid-template-columns value (fr, px, minmax).

import type { ReactNode } from "react";
import "./datatable.css";

export interface Column<T> {
  label: string;
  w?: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
  // Modo cartão (<1024px): papel da coluna quando a regra automática não serve
  // ("pair" força rótulo/valor numa célula que contém controle).
  card?: "title" | "actions" | "hide" | "pair";
}

interface Props<T> {
  cols: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}

export function DataTable<T>({ cols, rows, rowKey, onRowClick, empty }: Props<T>) {
  // Frações ganham piso de 10ch: o texto quebra em qualquer ponto, e sem piso
  // uma coluna de texto encolheria até uma letra por linha (spec 6a §3.7).
  const gridCols = cols.map((c) => {
    const w = c.w || "1fr";
    return /^\d*\.?\d+fr$/.test(w) ? `minmax(min(10ch, 100%), ${w})` : w;
  }).join(" ");
  if (rows.length === 0) {
    return <div className="mono" style={{ fontSize: 10.5, color: "var(--ink3)" }}>{empty ?? "sem dados"}</div>;
  }
  return (
    // As colunas são da tabela (--dt-cols); cabeçalho e linhas usam subgrid no
    // CSS, com as mesmas colunas como reserva onde não há suporte (spec 6a §3.7).
    <div role="table" className="dt" style={{ width: "100%", display: "grid", gridTemplateColumns: gridCols, columnGap: 12, ["--dt-cols" as string]: gridCols }}>
      <div
        role="row"
        className="mono dt-row dt-head"
        style={{
          display: "grid",
          gridColumn: "1 / -1",
          gap: 12,
          padding: "8px 10px",
          background: "var(--sunken)",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          fontSize: 10.5,
          color: "var(--ink3)",
          textTransform: "uppercase",
          letterSpacing: 0.5
        }}
      >
        {cols.map((c) => (
          <span key={c.label} role="columnheader" style={{ textAlign: c.align || "left" }}>
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((r, i) => {
        // Sem onRowClick a linha é um div: botões dentro da linha (ex.: Ficha/Entrar)
        // não podem ficar aninhados em outro button.
        const Row = onRowClick ? "button" : "div";
        return (
        <Row
          key={rowKey(r, i)}
          role="row"
          className="dt-row"
          {...(onRowClick ? { onClick: () => onRowClick(r) } : {})}
          style={{
            display: "grid",
            gridColumn: "1 / -1",
            gap: 12,
            width: "100%",
            padding: "10px 10px",
            background: "transparent",
            borderBottom: "1px solid var(--rule)",
            fontSize: 12,
            color: "var(--ink)",
            cursor: onRowClick ? "pointer" : "default",
            textAlign: "left",
            alignItems: "center"
          }}
        >
          {cols.map((c, ci) => (
            <span key={ci} role="cell" className="dt-cell" data-label={c.label}
            data-align={c.align && c.align !== "left" ? c.align : undefined} data-card={c.card}>
              {c.render(r)}
            </span>
          ))}
        </Row>
        );
      })}
    </div>
  );
}
