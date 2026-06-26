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

export const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "Visão geral",
    items: [
      { id: "overview", label: "Visão geral", icon: "▦" }
    ]
  },
  {
    label: "Aquisição",
    items: [
      { id: "ingestion",     label: "Ingestão",       icon: "↘" },
      { id: "conversations", label: "Conversas",      icon: "⇄" },
      { id: "consent",       label: "Consentimento",  icon: "✓" }
    ]
  },
  {
    label: "Triagem",
    items: [
      { id: "triages",        label: "Triagens",      icon: "≣" },
      { id: "classification", label: "Classificação", icon: "◔" }
    ]
  },
  {
    label: "Governança",
    items: [
      { id: "protocols", label: "Protocolos",          icon: "❏" },
      { id: "events",    label: "Eventos & auditoria", icon: "❖" }
    ]
  },
  {
    label: "Operação",
    items: [
      { id: "queues", label: "Filas & jobs", icon: "≋" },
      { id: "health", label: "Saúde",        icon: "◍" }
    ]
  },
  {
    label: "Setup",
    items: [
      {
        id: "cities",
        label: "Cidades",
        icon: "▤",
        visible: (u) => u.operator
      },
      {
        id: "setup_provision",
        label: "Provisionar cidade",
        icon: "+",
        visible: (u) => u.operator
      },
      {
        id: "setup_members",
        label: "Memberships",
        icon: "☰",
        visible: (u) => u.operator || u.memberships.some((m) => m.role === "municipal_admin")
      },
      { id: "setup_mfa", label: "MFA / 2 etapas", icon: "▢" }
    ]
  }
];
