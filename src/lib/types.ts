// Tipos dos payloads de /admin/api/*. Espelham API_CONTRACTS.md.

export interface ToneSegment {
  key?: string;
  label: string;
  count: number;
  tone?: string;
}

export interface OverviewKpi {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: string | null;
  tone: string;
  spark: number[];
  source: "live" | "proj";
}
export interface OverviewData { kpis: OverviewKpi[] }

export interface IngestionData {
  inboundSeries: number[];
  inboundTotal: number;
  ack: Array<{ code: string; label: string; count: number; tone?: string }>;
  dedup: number | null;
  purge: { pending: number; oldestH: number; ttlH: number; overTtl: boolean };
}

export interface ConversationsData {
  live: number;
  funnel: ToneSegment[];
  exits: ToneSegment[];
  abandonRate: number | null;
  avgToCompleteMin: number | null;
  liveActive: { awaiting: number; inProgress: number };
}

export interface ConsentData {
  given: number;
  revoked: number;
  declined: number | null;
  byVersion: Array<{ version: string; given: number; share: number }>;
  revocationsSeries: number[];
}

export interface TriagesData {
  series: number[];
  started: number;
  completed: number;
  completionRate: number;
  byProtocol: Array<{ version: string; count: number; share: number; status: string }>;
}

// Contrato de GET /admin/api/classification desde o módulo 05 (api bd706e5).
// Os tiers são vocabulário livre de cada protocolo (ex.: baixa/alta,
// indefinido): `tierKeys` dá a ordem das colunas do pivô, do mais urgente
// para o menos urgente. A urgência é priority ≤ urgentMaxPriority.
export interface SampleTriage {
  id: string;
  tier: string | null;
  priority: number | null;
  urgent: boolean;
  mode: string | null;
  protocol: string;
  at: string | null;
}

export interface ClassificationData {
  tiers: ToneSegment[];
  tierKeys: string[];
  urgent: number;
  urgentMaxPriority: number;
  urgentTrend: number[];
  byProtocol: Array<{ protocol: string; counts: Record<string, number> }>;
  byMode: Array<{ mode: string; label: string; count: number; share: number }>;
  // null = amostra oculta pela supressão de contagens pequenas (filtro de bairro).
  sampleTriages: SampleTriage[] | null;
}

export interface TrailStep {
  ev: string;
  rule: string | null;
  ref: string | null;
  out: string | null;
  at: string;
}
export interface TriageTrailData {
  triageId: string;
  protocol: string;
  mode: string | null;
  steps: TrailStep[];
}

export interface ProtocolRow {
  id: string;
  name: string;
  version: string;
  status: string;
  createdBy: string | null;
  publishedBy: string | null;
  fourEyes: boolean | null;
  publishedAt: string | null;
  retiredAt: string | null;
  schema: string;
  linter: string;
  gates: string;
}
export interface ProtocolsListData { list: ProtocolRow[] }

export interface ProtocolDetailData {
  id: string;
  name: string;
  versions: Array<{
    version: string;
    status: string;
    createdBy: string | null;
    publishedBy: string | null;
    fourEyes: boolean | null;
    at: string;
    schema: string;
    linter: string;
    gates: string;
  }>;
  events: Array<{ at: string; name: string; actor: string | null; ref: string }>;
}

export interface QueueRow {
  name: string;
  urgent: boolean;
  depth: number;
  oldestS: number;
  running: number;
  scheduled: number;
  failed: number;
  tone: string;
}
export interface FailedExecutionRow {
  jobClass: string;
  queue: string;
  error: string | null;
  attempts: number | null;
  at: string;
  ref: string | null;
}
export interface RecurringTaskRow {
  key: string;
  name: string;
  schedule: string;
  lastAgo: string;
  delayedMin: number;
  status: string;
  adr: string | null;
}
export interface QueuesData {
  queues: QueueRow[];
  oldestPendingS: number;
  failedExecutions: FailedExecutionRow[];
  recurring: RecurringTaskRow[];
}

export interface EventsData {
  total: number;
  retentionMonths: number;
  replayAnchor: { seq: string; at: string } | null;
  byType: Array<{ name: string; count: number }>;
  stream: Array<{
    at: string;
    name: string;
    actor: string;
    ref: string;
    muni: string | null;
  }>;
  filters: string[];
}

export interface HealthProjection {
  name: string;
  updatedAt: string | null;
  driftMin: number | null;
  thresholdMin: number;
  status: string;
}
export interface HealthData {
  projections: HealthProjection[];
  recurring: RecurringTaskRow[];
  driftOverall: number | null;
}

// ─── Cidades (catálogo do console, Plano 6) ──────────────────────────────────
export interface CityRow {
  id: string;
  slug: string;
  name: string;
  uf: string | null;
  status: string;
  schema_version: string | null;
  // Fuso IANA da cidade (api#27); ausente em api antigo.
  time_zone?: string;
  created_at: string;
  // Módulo 16 (contratos §4.2); ausentes em api antigo.
  record_mode?: RecordMode;
  ibge_code?: string | null;
  pec_url?: string | null;
  city_reachable?: boolean;
  features?: CityFeatureState[];
}

// ─── Módulo 16 (ADR 0028): modo de prontuário e interruptores ───────────────
// record_mode, ibge_code e pec_url são do operador (PATCH record_settings).
// features é SÓ LEITURA aqui: quem liga e desliga é o maintenance.
export type RecordMode = "off" | "integrated" | "record";

export interface CityFeatureState {
  key: string;
  enabled: boolean;
  usable: boolean;
  missing: string[];
}

// ibge_code mora no city_profile do banco da cidade (fonte única). Com o banco
// inalcançável, o api manda ibge_code: null e city_reachable: false — null aí
// NÃO é "vazio", e a ficha bloqueia a edição do IBGE.
export interface CityRecordFields {
  record_mode: RecordMode;
  ibge_code: string | null;
  pec_url: string | null;
  city_reachable: boolean;
  features: CityFeatureState[];
}

// GET /cities/:id (objeto solto, com os campos do item da lista) e o `city` de
// PATCH /cities/:id/record_settings.
export interface CityDetail extends Omit<CityRow, keyof CityRecordFields>, CityRecordFields {}
