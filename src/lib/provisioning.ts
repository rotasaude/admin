// Validação do formulário de provisionamento. Espelha ProvisionCity
// (apps/api/app/commands/provision_city.rb) e CityDatabase.valid_slug? — a API
// continua sendo a autoridade; isto só evita um 422 previsível.

export interface ProvisionCityPayload {
  slug: string;
  name: string;
  uf: string;
  ibge_code: string;
  admin_email: string;
  alert_email: string;
  time_zone: string;
}

// Fusos IANA do Brasil aceitos pela API (City::TIME_ZONES, api#27). O rótulo
// diz o deslocamento; não há horário de verão desde 2019.
export const TIME_ZONES: { id: string; label: string }[] = [
  { id: "America/Noronha", label: "UTC−2 · Fernando de Noronha" },
  { id: "America/Sao_Paulo", label: "UTC−3 · Brasília (Sul, Sudeste, GO, DF)" },
  { id: "America/Bahia", label: "UTC−3 · Bahia" },
  { id: "America/Fortaleza", label: "UTC−3 · CE, MA, PI, RN, PB" },
  { id: "America/Recife", label: "UTC−3 · Pernambuco" },
  { id: "America/Maceio", label: "UTC−3 · Alagoas e Sergipe" },
  { id: "America/Belem", label: "UTC−3 · Pará (leste) e Amapá" },
  { id: "America/Santarem", label: "UTC−3 · Pará (oeste)" },
  { id: "America/Araguaina", label: "UTC−3 · Tocantins" },
  { id: "America/Campo_Grande", label: "UTC−4 · Mato Grosso do Sul" },
  { id: "America/Cuiaba", label: "UTC−4 · Mato Grosso" },
  { id: "America/Porto_Velho", label: "UTC−4 · Rondônia" },
  { id: "America/Boa_Vista", label: "UTC−4 · Roraima" },
  { id: "America/Manaus", label: "UTC−4 · Amazonas (leste)" },
  { id: "America/Eirunepe", label: "UTC−5 · Amazonas (oeste)" },
  { id: "America/Rio_Branco", label: "UTC−5 · Acre" }
];

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

// Sugestão pelo estado; o operador confirma ou troca (o AM tem dois fusos).
const BY_UF: Record<string, string> = {
  AC: "America/Rio_Branco", AM: "America/Manaus", RR: "America/Boa_Vista", RO: "America/Porto_Velho",
  MT: "America/Cuiaba", MS: "America/Campo_Grande", BA: "America/Bahia", PE: "America/Recife",
  AL: "America/Maceio", SE: "America/Maceio", CE: "America/Fortaleza", MA: "America/Fortaleza",
  PI: "America/Fortaleza", RN: "America/Fortaleza", PB: "America/Fortaleza", PA: "America/Belem",
  AP: "America/Belem", TO: "America/Araguaina"
};

export function suggestedTimeZone(uf: string): string {
  return BY_UF[uf.toUpperCase()] ?? DEFAULT_TIME_ZONE;
}

const SLUG = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED = [ "admin", "api", "auth", "www" ];
const UF = /^[A-Z]{2}$/;
const IBGE = /^\d{7}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateProvisionForm(p: ProvisionCityPayload): string[] {
  const bad: string[] = [];
  const slugOk = p.slug.length >= 2 && p.slug.length <= 40 && SLUG.test(p.slug) && !RESERVED.includes(p.slug);
  if (!slugOk) bad.push("slug");
  if (!p.name.trim()) bad.push("name");
  if (!UF.test(p.uf)) bad.push("uf");
  if (!IBGE.test(p.ibge_code)) bad.push("ibge_code");
  if (!EMAIL.test(p.admin_email)) bad.push("admin_email");
  if (!EMAIL.test(p.alert_email)) bad.push("alert_email");
  if (!TIME_ZONES.some((z) => z.id === p.time_zone)) bad.push("time_zone");
  return bad;
}
