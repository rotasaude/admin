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
  | "health";

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
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
  }
];
