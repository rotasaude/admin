// Catálogo de módulos do Admin Console. Organizado nos grupos do brief.
// Ícones mono são glifos por item (NAVBAR.md §3.1).

export type ModuleId =
  | "overview"
  | "ingestion"
  | "conversations"
  | "consent"
  | "triages"
  | "classification"
  | "protocols"
  | "events"
  | "queues"
  | "health"
  // Setup multi-tenant (ADR-0023/0024)
  | "setup_mfa"
  | "cities";

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  // Visibilidade: se função, recebe SessionUser e retorna se deve aparecer.
  visible?: (user: { operator: boolean; memberships: { role: string }[] }) => boolean;
}

export interface NavGroupDef {
  label: string;
  items: NavItem[];
}

// Plano 6/8: o console (admin.*) só responde às rotas do PlatformConsoleHost.
// Os módulos city-scoped (Visão geral, Ingestão, Conversas, Consentimento,
// Triagens, Classificação, Protocolos, Eventos, Filas, Saúde) 404 em admin.* e
// ficam fora da navegação; os arquivos seguem no repo. As telas de membership e
// de provisionamento antigo foram REMOVIDAS no Plano 8: membership é operação
// dentro da cidade (entre pela cidade, via grant) e o provisionamento passou a
// falar com POST /cities.
export const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "Setup",
    items: [
      {
        id: "cities",
        label: "Cidades",
        icon: "▤",
        visible: (u) => u.operator
      }
    ]
  }
];
