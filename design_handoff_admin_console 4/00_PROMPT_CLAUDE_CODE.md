# Prompt de implementação — Dashboard administrativo (Rota Saúde) · **com material visual de apoio**

> **Versão adaptada para execução no Claude Code.** É a mesma especificação funcional
> do brief original (§0–§10), agora amarrada ao **material visual de apoio** já
> produzido (o protótipo *Rota Saúde · Admin Console*) e aos **contratos de dados**
> derivados dele. O protótipo é a **fonte da verdade visual e de contrato**; este
> documento manda na arquitetura e nas restrições.

- **Tipo:** Brief de implementação (não é ADR; consome a arquitetura já decidida).
- **Fase:** 1 — **somente visualização** (read-only). Nenhuma mutação de estado.
- **Stack alvo:** Rails 8 (`apps/api/`) + React (`apps/web/`), conforme ADR 0018.
- **Premissas declaradas:** dashboard interno para a **equipe da plataforma / SRE**
  e operação/auditoria da municipalidade (não para o cidadão); escopo por
  `municipality_id`; lê de projeções/agregados, não recomputa. Se alguma premissa
  estiver errada, ajuste antes de implementar.

---

## 0. Papel e ponto de partida

Você vai implementar um painel administrativo **de leitura** que dá visibilidade
operacional sobre os módulos do Rota Saúde. Antes de escrever código:

1. Leia os ADRs em `docs/` (0001–0018) e a nota de revisão.
2. **Abra o material visual de apoio** deste pacote (ver §0.1). Ele define
   layout, hierarquia, tokens, componentes, estados e — via os mocks — o
   **formato exato de cada resposta de API**.
3. O painel **não introduz arquitetura nova de domínio** — observa o que os ADRs
   já definiram. Toda fonte de dado abaixo aponta para o ADR que a governa.

### 0.1 Material visual de apoio (neste pacote)

| Arquivo | O que é |
|---|---|
| `design_reference/Rota Saúde · Admin Console.html` | **Protótipo navegável hi-fi** (React + Babel in-browser). Fonte da verdade visual. |
| `design_reference/Admin Console (standalone).html` | Mesmo protótipo, **self-contained** (abre offline, sem servidor). |
| `design_reference/console-data.js` | **Mock data** — a forma de cada objeto aqui **é o contrato JSON** que a API deve servir. Ver `API_CONTRACTS.md`. |
| `design_reference/console-ui.jsx` | Primitivos de UI + **design tokens** (`AT`). Ver `DESIGN_TOKENS.md`. |
| `design_reference/console-modules-a.jsx` / `-b.jsx` | As 10 views de módulo + drill-downs (trail, protocolo). |
| `design_reference/console-app.jsx` | Shell: navbar com dropdowns, menu de notificações, escopo (município/período). |
| `API_CONTRACTS.md` | Schema JSON de cada endpoint do §6, derivado do mock. |
| `DESIGN_TOKENS.md` | Cores, tipografia, raios, sombras, espaçamento. |
| `COMPONENTS.md` | Inventário de componentes e onde cada um aparece. |

> **Fidelidade: hi-fi.** Recrie a UI **fielmente** usando as bibliotecas e
> padrões já existentes em `apps/web/` (`packages/ui`, Recharts, etc.). O HTML
> empacotado é **referência de design**, não código para copiar e colar — os
> estilos inline e o React-via-Babel do protótipo existem só para prototipar.

---

## 1. Objetivo

Um dashboard que responda, por módulo, a "o que está acontecendo agora" e "como
evoluiu", para operação e auditoria. Nesta fase é **só visualização**: contagens,
distribuições, séries temporais, listas de inspeção. Nenhuma ação que mude estado
(publicar protocolo, retry de job, apagar dado) entra agora — ver §8.

O protótipo já materializa esse objetivo: **navbar horizontal com dropdowns por
grupo** (Visão geral · Aquisição · Triagem · Governança · Operação), seletor de
**município** e **período** (hoje/7d/30d) no topo-direito, e um **menu de
notificações (sino)** que separa *alertas ativos* de *limitações conhecidas*.

---

## 2. Restrições não-negociáveis (derivadas dos ADRs)

Estas regras prevalecem sobre conveniência de UI. Violar qualquer uma é bug.
O protótipo já foi desenhado para respeitá-las — preserve isso na implementação.

1. **Sem dado clínico cru (LGPD — ADR 0009, 0011, 0015).** O painel **nunca**
   renderiza `inbound_messages.raw` nem o conteúdo de
   `conversation.answers`/respostas clínicas individuais. Trabalha com
   **agregados** e **referências** (`triage_id`, `protocol_id`, `actor_user_id`,
   `version`, `tier`, `priority`). `tier`/`score`/`priority` são metadado
   operacional e podem aparecer agregados; o **trail** (ADR 0015) mostra **qual
   regra disparou e sobre qual referência** — ver a view de Classificação no
   protótipo (badge "sem dado clínico"), nunca texto clínico livre.
   → **No backend:** os serializers de `Admin::` devem ter allowlist de campos;
   é proibido incluir `raw`/`answers`. Adicione um teste que falha se vazarem.

2. **Multi-tenancy (ADR 0016).** Todo dado é escopado por `municipality_id`.
   Nenhum endpoint retorna dado fora do tenant do usuário. Default: usuário vê
   só a sua municipalidade; preveja um papel **cross-tenant (superadmin)** atrás
   de flag — no protótipo é a opção "◈ Todos os municípios" no seletor.

3. **Read side, sem recompute pesado (ADR 0007).** Leia de projeções quando
   existirem (`dashboard_metrics`, `report_snapshots`). Onde não houver, use
   agregações **indexadas e limitadas**. O painel **nunca** dispara recomputação
   nem roda `evaluate` no request. Postgres é a fonte da verdade; o painel é
   leitor. **Anote por métrica** se é projeção ou ao vivo (ver §7 e o campo
   `source` em `API_CONTRACTS.md`).

4. **Atrás de autenticação (lacuna — nota de revisão §2.1).** O ADR de auth não
   existe. **Não implemente auth aqui.** Assuma `current_user` +
   `current_municipality` já resolvidos e **proteja todos os endpoints** com
   eles. Registre como bloqueio para produção (§9).

5. **Honestidade sobre consistência eventual (ADR 0007).** Todo painel exibe um
   carimbo **"dados de \<timestamp\>"**. Métrica de projeção mostra o
   `updated_at` da projeção, não o "agora". → No protótipo: componente `AAsOf`
   no header de cada `APanel` + badge `ASource` (ao vivo / projeção) em cada KPI.

6. **Imutabilidade (ADR 0007/0016).** O painel não edita protocolo, triagem,
   consentimento nem `domain_events`. Read-only no nível de banco (conexão/role
   sem privilégio de escrita nas tabelas de domínio, se viável).

---

## 3. Arquitetura do painel

- **Backend (projeto `/api`, Rails 8 — scaffold já implementado):** **explore e
  siga as convenções existentes**; **não re-scaffolde**. Acrescente o namespace
  novo e isolado `Admin::` (ex. `app/controllers/admin/api/`), servindo JSON de
  **agregados**, **reusando** a fronteira de auth e os modelos/projeções já
  presentes. Sem endpoints de escrita na fase 1. Controllers finos; agregação em
  **query objects / read models**, testáveis isoladamente. Toda resposta segue o
  envelope `{ data: ..., as_of: <iso8601> }` (ver §6 / `API_CONTRACTS.md`).
  Detalhe de localização e passo de descoberta em
  `01_PROMPT_EXECUCAO_dashboard.md`.
- **Frontend (projeto `/dashboard`, React):** i18n **PT-BR**, timezone
  **America/Sao_Paulo**. **Recrie a UI do protótipo** com `packages/ui` + a lib
  de gráficos já adotada (Recharts no brief). Estrutura sugerida espelhando o
  protótipo:
  - `AppShell` (navbar + dropdowns + escopo + sino de notificações) ← `console-app.jsx`
  - primitivos (`Panel`, `Stat`, `SourceBadge`, `AsOfStamp`, `Tag`, `Stack`,
    `Funnel`, `Spark`, `Bars`, `Meter`, `Table`, `Caveat`, `Empty`, `Skeleton`)
    ← `console-ui.jsx` / `COMPONENTS.md`
  - uma página por módulo ← `console-modules-a/b.jsx`
  - **Estados de loading/erro/vazio explícitos** em cada painel (o protótipo já
    define `Skeleton` e `Empty`; nunca renderize `0` como se fosse dado
    carregado).
- **Fetching:** um hook por endpoint (ex. React Query), com `period` e
  `municipality_id` como chaves de cache. Refetch manual/polling (sem realtime —
  §8).
- **Solid Queue:** confira os nomes reais de tabelas/relations da versão em uso
  antes de consultar `ready/scheduled/failed/recurring`.

---

## 4. Módulos a cobrir

As 10 views já existem no protótipo, com layout e métricas definidos. Para cada
módulo o brief original vale integralmente; abaixo o resumo + **onde ver** e
**qual endpoint/contrato**. Detalhes de campo em `API_CONTRACTS.md`.

| # | Módulo | View no protótipo | Endpoint | Fonte (ADR) |
|---|---|---|---|---|
| 4.0 | Visão geral | `OverviewView` | `GET /overview` | `dashboard_metrics` + agregados (0007) |
| 4.1 | Ingestão (WhatsApp) | `IngestionView` | `GET /ingestion` | `inbound_messages` metadados (0010/0011) |
| 4.2 | Conversas / FSM | `ConversationsView` | `GET /conversations` | `conversations` (0012) |
| 4.3 | Consentimento | `ConsentView` | `GET /consent` | `consents` + `consent.*` (0012) |
| 4.4 | Triagens | `TriagesView` | `GET /triages` | `triages` + `report_snapshots` (0006/0007/0013) |
| 4.5 | Classificação / Scoring | `ClassificationView` (+ trail) | `GET /classification`, `GET /triages/:id/trail` | snapshot congelado (0015/0017) |
| 4.6 | Protocolos / Cadastro | `ProtocolsView` (+ detalhe) | `GET /protocols`, `GET /protocols/:id` | `protocols` + `protocol.*` (0016) |
| 4.7 | **Filas / Jobs** | `QueuesView` | `GET /queues` | Solid Queue (0001/0008) |
| 4.8 | Eventos / Auditoria | `EventsView` | `GET /events` | `domain_events` (0003/0009) |
| 4.9 | Saúde / Operacional | `HealthView` | `GET /health` | frescor/drift (0007/0009/0011/0012) |

**Notas de privacidade que o protótipo já aplica (mantenha):**
- 4.1 nunca expõe `raw`; mostra **backlog de purga** (idade vs TTL) como sinal LGPD.
- 4.5 trail = sequência de regras/referências (`scored`/`rule_matched`/
  `priority_rule`/`tier_assigned`), `scoring.mode` lido do snapshot.
- 4.6 sinaliza **quatro-olhos colapsado** (created_by == published_by).
- 4.8 payload é **só referência**.

---

## 5. Painel de filas — destaque e ressalva honesta

Painel de **maior valor operacional** (lacuna §2.2/§6.2). Mostre, no mínimo:
profundidade e idade do mais antigo **por fila** (`:urgent` em destaque);
`failed_executions` com classe de job, erro e tentativas; status/atraso das
recurring tasks. Tudo já desenhado em `QueuesView`.

**Ressalva obrigatória (no painel E no código):** este painel só enxerga falhas
**observáveis**. O bug de idempotência (§1.2/§6.1) — `processed_events` gravado
**antes** do efeito — produz no-op silencioso que **parece sucesso e nunca chega
a `failed_executions`**. Não dê a impressão de que "fila verde = entrega
garantida".

→ **No protótipo** essa ressalva foi extraída dos painéis e centralizada no
**menu de notificações (sino)**, seção **"Limitações conhecidas"** — sempre
presente, junto de *"worker parado é risco LGPD"*. Mantenha esse padrão:
implemente um **centro de notificações** com duas seções:
- **Alertas ativos** — derivados do estado atual do escopo (ver `deriveAlerts`
  em `console-app.jsx`): execuções falhadas, `:urgent` atrasada, retenção LGPD
  acima do TTL, projeções derivando, recurring atrasada, quatro-olhos colapsado.
  Cada alerta navega para o módulo de origem.
- **Limitações conhecidas** — as ressalvas honestas estruturais (sempre visíveis).

Comente no código a limitação do §1.2/§6.1 onde o painel de filas é montado.

---

## 6. Contrato de API

Namespace read-only, todos escopados por município e exigindo auth (§2.4). Todos
retornam `{ data: ..., as_of: <iso8601> }`. **Os schemas completos de `data`
estão em `API_CONTRACTS.md`** (derivados de `console-data.js`).

```
GET /admin/api/overview?period=7d
GET /admin/api/ingestion?period=7d
GET /admin/api/conversations?period=7d
GET /admin/api/consent?period=7d
GET /admin/api/triages?period=7d
GET /admin/api/classification?period=7d
GET /admin/api/protocols
GET /admin/api/protocols/:id            # versões + status + validação
GET /admin/api/triages/:id/trail        # trail por referências (sem dado clínico)
GET /admin/api/queues                   # filas, failed_executions, recurring tasks
GET /admin/api/events?name=&from=&to=   # domain_events (referências)
GET /admin/api/health                   # frescor de projeção, drift, recurring
```

Sem rotas `POST/PATCH/DELETE` nesta fase.

**Parâmetros comuns:** `period` ∈ `today|7d|30d` (+ intervalo custom `from`/`to`),
`municipality_id` (implícito por `current_municipality`; para superadmin, aceitar
`municipality_id=all` ou explícito atrás da flag cross-tenant). Bordas de dia em
America/Sao_Paulo.

> **Importante sobre o mock vs API real:** no protótipo, valores numéricos vêm
> às vezes **pré-formatados** (ex. `"1.234"`, `"79,5"`) para acelerar o
> protótipo. **Na API real, retorne números crus** (`1234`, `79.5`) e formate em
> PT-BR no frontend. O campo `source: "live" | "proj"` por métrica/painel é
> **parte do contrato** (alimenta o badge `ASource` e o carimbo `AAsOf`).

---

## 7. Considerações de implementação

- **Projeção vs. ao vivo:** decida por métrica e **anote no código** a origem; o
  contrato já carrega `source`. Se uma métrica precisar de **projeção nova, não a
  crie aqui** — registre como candidato a ADR (§9), pois projeção nova é decisão
  de read-side (ADR 0007).
- **Índices:** toda agregação ao vivo precisa de índice que a sustente. Veja a
  lista **assumida/faltante** abaixo (mova para o PR como checklist).
- **Período/timezone:** janelas em America/Sao_Paulo; aceite `today/7d/30d` +
  custom; bordas de dia no fuso local, não UTC.
- **i18n:** todos os rótulos em PT-BR (já estão no protótipo — reaproveite as
  strings como base de chaves i18n).
- **Tipografia/tokens:** ver `DESIGN_TOKENS.md`. O protótipo usa uma escala
  sóbria branco/cinza (família Geist; mono Geist Mono) — mapeie para os tokens
  do `packages/ui` se já houver equivalentes, ou registre os tokens novos.
- **Estados de UI:** loading (Skeleton), erro e vazio (Empty) explícitos por
  painel; nunca renderize `0` como se fosse dado carregado.

### 7.1 Índices assumidos (verifique) e faltantes (provável criação)

| Tabela | Índice assumido | Sustenta |
|---|---|---|
| `triages` | `(municipality_id, created_at)`, `(municipality_id, protocol_version)`, `(municipality_id, tier)` | 4.0/4.4/4.5 volume, quebras, distribuição |
| `conversations` | `(municipality_id, status, updated_at)` | 4.2 funil, ativas agora |
| `inbound_messages` | `(municipality_id, status, created_at)`, `(processed, raw_purged_at)` | 4.1 volume, backlog de purga |
| `consents` | `(municipality_id, status, created_at)`, `(consent_version)` | 4.3 quebras, revogações |
| `domain_events` | `(municipality_id, name, occurred_at)` | 4.8 stream/contagem por tipo |
| `protocols` | `(protocol_id, version)`, `(status)` | 4.6 lista/detalhe |
| Solid Queue | conforme schema da versão (`ready/scheduled/failed/recurring`) | 4.7 |

> Marque no PR quais já existem e quais faltam. **Não crie projeção nova** para
> fechar buracos — isso é ADR (§9.4).

---

## 8. Fora de escopo (fase 1 — explícito)

- Qualquer **mutação**: publicar/aposentar protocolo, retry/descarte de job,
  apagar/purgar dado, reenfileirar evento. (Fase 2, com RBAC e auditoria.)
- **Implementação de auth** (depende do ADR pendente — §2.4).
- **Push em tempo real** (websocket/SSE). Fase 1 é polling/refresh manual.
- Qualquer superfície **voltada ao cidadão**.
- Integração SUS/CNS (§2.5 da revisão).

---

## 9. Dependências e riscos conhecidos (carregue para frente)

1. **Auth ADR pendente** — bloqueio para produção; o painel assume a fronteira.
2. **Monitoramento de fila não tem ADR** (§2.2): este painel cobre a **leitura**;
   **alerta/escalonamento** (dead-letter-para-humano, plantão) é decisão
   operacional separada — provável ADR próprio. O **centro de notificações** do
   protótipo é o ponto natural para plugar isso na Fase 2.
3. **Bug de idempotência (§1.2/§6.1)** limita o painel de filas — ver §5. Não é
   resolvível na camada de visualização.
4. **Projeção nova = decisão de read-side (ADR 0007).** Se o painel "pedir" uma
   projeção inexistente, vira proposta de ADR, não código improvisado.
5. **Drift de projeção** depende das recurring tasks vivas; a view de Saúde
   torna isso visível, não pressupõe que está rodando.

---

## 10. Critérios de aceite

- [ ] Cada módulo de §4 tem ao menos um painel com métrica agregada + carimbo
      "as of", visualmente fiel ao protótipo.
- [ ] Nenhum endpoint vaza dado fora do `municipality_id` do usuário (teste).
- [ ] Nenhum ponto renderiza `raw` ou conteúdo de resposta clínica individual
      (teste de serializer com allowlist).
- [ ] Painel de filas mostra `failed_executions` + status das recurring tasks,
      com a ressalva da §5 visível (centro de notificações → "Limitações").
- [ ] Nenhuma rota de escrita existe no namespace `Admin::`.
- [ ] Cada métrica carrega `source` (projeção vs ao vivo) e o frontend reflete
      no badge.
- [ ] Estados loading/erro/vazio implementados por painel.
- [ ] PR lista: índices assumidos/faltantes, métricas projeção vs ao vivo, e as
      dependências de §9.
