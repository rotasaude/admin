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
  | "setup_provision"
  | "setup_members"
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

// Plano 6 (fix wave, Important #1): o console (admin.*) só responde às rotas
// do PlatformConsoleHost. Os demais módulos (Visão geral, Ingestão,
// Conversas, Consentimento, Triagens, Classificação, Protocolos, Eventos,
// Filas, Saúde, Memberships, Provisionar cidade, MFA) são city-scoped
// (CityResolution#within_city) e 404 em admin.* — confirmado por requisição
// direta. Eles ficam fora da navegação até terem um host onde respondam;
// os arquivos dos módulos não foram removidos.
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
