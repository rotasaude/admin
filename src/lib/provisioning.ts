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
  return bad;
}
