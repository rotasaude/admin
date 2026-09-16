// Catálogo do console e entrada numa cidade (Plano 6). O console não tem sessão
// na cidade: ele pede um grant de 60 s (POST /city_grants) e manda o navegador
// para o host da cidade, que consome o grant em POST /session/grant.
import { createCityGrant } from "./api";
import type { CityRow } from "./types";

const ATTENTION = [ "provisioning", "suspended", "archived" ];

export function sortedForDisplay(rows: CityRow[]): CityRow[] {
  return [ ...rows ].sort((a, b) => {
    const aFirst = ATTENTION.includes(a.status) ? 0 : 1;
    const bFirst = ATTENTION.includes(b.status) ? 0 : 1;
    if (aFirst !== bFirst) return aFirst - bFirst;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export async function enterCity(slug: string, go: (url: string) => void): Promise<void> {
  const grant = await createCityGrant(slug);
  go(grant.redirect_url);
}
