// ScopePicker — seletor de município (NAVBAR.md §4.1).
// <select> nativo estilizado; seta custom via background-image SVG.
// Opções cross-tenant ganham prefixo "◈ ".

import { useEffect, useState } from "react";
import { adminFetch } from "../lib/api";

interface Municipality {
  id: string | null;
  name: string;
  cross_tenant: boolean;
}

interface Props {
  value: string | "all";
  onChange: (v: string | "all") => void;
}

const CHEVRON_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'>` +
      `<path d='M1 1.5 L4 4.5 L7 1.5' fill='none' stroke='%23999' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/>` +
    `</svg>`
  );

export function ScopePicker({ value, onChange }: Props) {
  const [ list, setList ] = useState<Municipality[]>([]);

  useEffect(() => {
    adminFetch<Municipality[]>("/municipalities")
      .then((res) => setList(res.data as unknown as Municipality[]))
      .catch(() => setList([]));
  }, []);

  return (
    <>
      <label
        htmlFor="scope-municipality"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0
        }}
      >
        Município
      </label>
      <select
        id="scope-municipality"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mono"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink)",
          background: `var(--sunken) url("${CHEVRON_SVG}") no-repeat right 9px center`,
          border: "1px solid var(--rule2)",
          borderRadius: 8,
          padding: "6px 26px 6px 10px",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          cursor: "pointer"
        }}
      >
        {list.length === 0 && <option value="default">—</option>}
        {list.map((m) => {
          const id = m.id || "default";
          const prefix = m.cross_tenant ? "◈ " : "";
          return (
            <option key={id} value={id}>
              {prefix}{m.name}
            </option>
          );
        })}
      </select>
    </>
  );
}
