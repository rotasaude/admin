import type { ProtocolRow } from "./types";

// Uma versão "publicada", para o KPI do console, é a que já passou da
// publicação: `published` (publicada, ainda não ativada) e `active` (a que
// está EM USO agora, respondendo triagem). A leitura do api distingue as duas
// desde que `Admin::ProtocolsQuery` parou de colapsar `active` em `published`;
// contar só `published` subtraía a versão vigente da conta, em silêncio.
const PUBLISHED_STATUSES = [ "published", "active" ];

export function publishedCount(list: ProtocolRow[]): number {
  return list.filter((row) => PUBLISHED_STATUSES.includes(row.status)).length;
}
