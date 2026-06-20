# Prompt de execução — Admin Console (`/dashboard` + `/api`)

> **Cole este arquivo como instrução no Claude Code.** É o prompt de execução do
> *Rota Saúde · Admin Console* (Fase 1, read-only), **fixando frontend em
> `/dashboard` e backend em `/api`** (projetos irmãos na raiz). Ele complementa —
> não substitui — `00_PROMPT_CLAUDE_CODE.md` (spec funcional/restrições),
> `API_CONTRACTS.md`, `DESIGN_TOKENS.md` e `COMPONENTS.md`, neste mesmo pacote.

---

## 0. Premissa de localização (LEIA PRIMEIRO)

Dois projetos **irmãos na raiz** do repositório:

```
<raiz>
├── api/          ← Rails 8 · backend — **scaffold JÁ IMPLEMENTADO**
└── dashboard/    ← React · frontend do Admin Console (a criar)
```

- **Backend `/api` já existe e está scaffoldado.** **NÃO recrie o projeto.**
  Primeiro **explore** `/api` e **siga as convenções já estabelecidas** (layout de
  pastas, padrão de controller/serializer/query object, fronteira de auth
  `current_user`/`current_municipality`, framework de teste, modelos e
  **projeções** existentes). Sua tarefa no backend é **acrescentar apenas o
  namespace read-only `Admin::`** que lê o que já existe — ver §2.
- **Frontend** (React) → **`/dashboard`** (a criar). Apenas **consome** a API.
- API exposta em **`/admin/api/...`** (ADR 0018), somente leitura.
- São apps **separados** (build/deploy independentes). Em dev rodam em portas
  distintas; o frontend fala com o backend via proxy (ver §3).

Tudo o mais (restrições LGPD/multi-tenancy/read-side, módulos §4, contrato §6,
critérios de aceite §10) segue `00_PROMPT_CLAUDE_CODE.md` **sem alteração** — só
muda **onde** o código é escrito.

---

## 1. Estrutura de pastas — `/dashboard` (frontend)

Crie o app do console em `/dashboard`. Se o projeto já tem um app React/Vite
padrão, espelhe a convenção dele; caso contrário, use esta árvore:

```
/dashboard
├── package.json
├── index.html
├── vite.config.ts                 # base: '/dashboard/'  (ver §3)
├── .env.example                   # VITE_ADMIN_API_BASE=/admin/api
├── public/
│   └── fonts/                      # Geist / Geist Mono (ou via packages/ui)
└── src/
    ├── main.tsx
    ├── App.tsx                     # ← shell: console-app.jsx (TopNav, dropdowns, escopo, sino)
    ├── theme/
    │   └── tokens.ts               # ← DESIGN_TOKENS.md (cores oklch, type scale, raios)
    ├── lib/
    │   ├── api.ts                  # fetch + envelope { data, as_of }; base = VITE_ADMIN_API_BASE
    │   ├── scope.ts                # period (today|7d|30d|custom) + municipality_id
    │   ├── format.ts               # PT-BR (Intl), timezone America/Sao_Paulo
    │   └── alerts.ts               # ← deriveAlerts() (console-app.jsx)
    ├── hooks/
    │   ├── useOverview.ts          # um hook por endpoint (React Query),
    │   ├── useIngestion.ts         #   key = [endpoint, period, municipality_id]
    │   ├── useQueues.ts            #   ... (12 endpoints — ver API_CONTRACTS.md)
    │   └── ...
    ├── components/                 # ← console-ui.jsx (primitivos)
    │   ├── Panel.tsx  Stat.tsx  SourceBadge.tsx  AsOfStamp.tsx
    │   ├── Tag.tsx  StatusDot.tsx  StackedBar.tsx  Funnel.tsx
    │   ├── Sparkline.tsx  BarMini.tsx  Meter.tsx  DataTable.tsx
    │   ├── EmptyState.tsx  Skeleton.tsx  Divider.tsx
    │   └── NotificationCenter.tsx   # sino: alertas ativos + limitações conhecidas
    ├── shell/
    │   ├── AppHeader.tsx  NavDropdown.tsx  SegmentedControl.tsx  ScopePicker.tsx
    └── modules/                    # ← console-modules-a/b.jsx (uma página por módulo)
        ├── Overview.tsx
        ├── Ingestion.tsx  Conversations.tsx  Consent.tsx  Triages.tsx
        ├── Classification.tsx        # + drill-down Trail
        ├── Protocols.tsx             # + drill-down Detalhe
        ├── Queues.tsx  Events.tsx  Health.tsx
```

> Mapeamento arquivo-do-protótipo → destino está em `COMPONENTS.md`. Os `.jsx`/
> `.js` em `design_reference/` são **referência**; reescreva em TS/JSX do
> codebase, com os componentes do `packages/ui` quando houver equivalente.

---

## 2. Backend `/api` — acrescentar o namespace read-only (scaffold já existe)

> O projeto `/api` **já está scaffoldado**. **Descoberta primeiro, código depois.**

### 2.1 Antes de escrever qualquer coisa, explore `/api` e levante:
- Layout real de pastas e **convenções** (onde moram controllers, serializers,
  query objects/read models, services).
- A **fronteira de auth** já existente (`current_user` / `current_municipality`
  ou equivalente) — **reutilize-a**, não crie outra (§2.4 do brief).
- **Modelos e projeções** já presentes (`triages`, `conversations`, `consents`,
  `inbound_messages`, `protocols`, `domain_events`, `dashboard_metrics`,
  `report_snapshots`, tabelas do Solid Queue). Liste o que existe vs o que falta.
- Lib de serialização e **framework de teste** em uso — siga os mesmos.

### 2.2 Depois, adicione **somente** o namespace `Admin::` (read-only):
Respeitando as convenções encontradas, algo como:

```
/api/app/
    ├── controllers/admin/api/
    │   ├── base_controller.rb          # autentica current_user + current_municipality (§2.4),
    │   │                               #   força escopo por municipality_id, envelope { data, as_of }
    │   ├── overview_controller.rb
    │   ├── ingestion_controller.rb
    │   ├── conversations_controller.rb
    │   ├── consent_controller.rb
    │   ├── triages_controller.rb       # show: /triages/:id/trail
    │   ├── classification_controller.rb
    │   ├── protocols_controller.rb     # index + show
    │   ├── queues_controller.rb
    │   ├── events_controller.rb
    │   └── health_controller.rb
    ├── queries/admin/                  # read models / query objects testáveis
    │   ├── overview_query.rb  ingestion_query.rb  ... (agregação aqui, controller fino)
    └── serializers/admin/              # allowlist de campos — proíbe raw/answers (teste!)
```

Rotas (`/api/config/routes.rb`):
```ruby
namespace :admin do
  namespace :api do
    get :overview;     get :ingestion;   get :conversations
    get :consent;      get :triages;     get :classification
    get :protocols;    get "protocols/:id", to: "protocols#show"
    get "triages/:id/trail", to: "triages#trail"
    get :queues;       get :events;      get :health
    get :municipalities
  end
end
# Sem POST/PATCH/DELETE neste namespace (Fase 1).
```

> **Reuse, não duplique.** Os nomes acima são orientativos — se o scaffold de
> `/api` já define um padrão de namespacing, serialização ou query objects,
> **siga-o**. Não crie modelos, migrations nem projeções novas aqui: o painel
> **lê** o que existe. Se uma métrica exigir projeção inexistente, **não a crie** —
> registre como candidato a ADR (read-side, ADR 0007 / §9.4 do brief) e sinalize.
> Se uma agregação ao vivo precisar de índice que falta, liste-o no PR (§7.1).

---

## 3. Integração frontend (`/dashboard`) ⇄ backend (`/api`)

- **Base da API:** `VITE_ADMIN_API_BASE` (default `/admin/api`). Todo fetch passa
  por `lib/api.ts`, que valida o envelope `{ data, as_of }` e propaga `as_of`/
  `source` para os carimbos `AsOfStamp` e badges `SourceBadge`.
- **Dev:** os dois apps rodam separados (ex. Rails `:3000`, Vite `:5173`).
  Configure **proxy do Vite** de `/admin/api` → `http://localhost:3000` para
  preservar cookies de sessão na mesma origem aparente. Sem URLs hardcoded.
- **Produção:** sirva `/dashboard` (build estático, `base: '/dashboard/'`) e
  `/api` atrás do **mesmo domínio** via reverse-proxy (ex. `/dashboard` → build,
  `/admin/api` → Rails). Mesma origem evita CORS e mantém a sessão
  `current_user`/`current_municipality`.
- **Se domínios distintos forem inevitáveis:** habilite CORS no `/api` com
  allowlist de origem + `credentials`, e cookies `SameSite=None; Secure`.
  Registrar como item de infra.
- **Scope global:** `period` + `municipality_id` num provider (Context/Zustand);
  trocar qualquer um invalida/refetcha todas as queries.

---

## 4. O que recriar (resumo — detalhe nos outros docs)

1. **Shell** (`App.tsx` + `shell/`): navbar horizontal **fluida 100%** com grupos
   em **dropdown** (Visão geral · Aquisição · Triagem · Governança · Operação),
   `ScopePicker` (município, incl. "◈ Todos" p/ superadmin atrás de flag) +
   `SegmentedControl` (hoje/7d/30d) + **`NotificationCenter`** + relógio "ao vivo".
2. **Primitivos** (`components/`): ver `COMPONENTS.md`. Atenção a `SourceBadge`
   (ao-vivo × projeção) e `AsOfStamp` ("dados de …") — requisito §2.5.
3. **10 módulos** (`modules/`) + drill-downs **Trail** (`/triages/:id/trail`) e
   **Detalhe de protocolo** (`/protocols/:id`).
4. **Centro de notificações:** seção *Alertas ativos* (derivados via
   `lib/alerts.ts`, cada um navega ao módulo) + *Limitações conhecidas* (ressalva
   obrigatória do painel de filas — "fila verde ≠ entrega garantida" — e "worker
   parado = risco LGPD"). **Sempre visível.**
5. **Estados** loading/erro/vazio por painel (`Skeleton`/erro+retry/`EmptyState`).
   Nunca renderizar `0` como dado carregado.

---

## 5. Critérios de aceite específicos de localização

Além dos critérios do `00_PROMPT_CLAUDE_CODE.md` §10:
- [ ] Frontend em **`/dashboard`** buildando e servido com `base: '/dashboard/'`.
- [ ] Backend: **nenhum re-scaffold de `/api`**; apenas o namespace `Admin::Api`
      foi acrescentado, **seguindo as convenções do scaffold existente** e
      reusando a fronteira de auth e os modelos/projeções já presentes.
- [ ] Namespace `Admin::Api` **somente leitura**, escopado por `municipality_id`,
      com allowlist de serializer (teste que falha se `raw`/`answers` vazarem).
- [ ] Frontend consome **`/admin/api`** via `VITE_ADMIN_API_BASE` (sem URLs
      hardcoded); proxy de dev configurado.
- [ ] Nenhuma rota de escrita no namespace.
- [ ] PR lista: modelos/projeções existentes usados vs faltantes, índices
      assumidos/faltantes, e métricas projeção vs ao vivo.
- [ ] README do `/dashboard` documenta env vars + proxy de dev.

---

## 6. Resumo da topologia

```
<raiz>
├── api/         → Rails 8 · Admin::Api (read-only) · serve /admin/api/*
└── dashboard/   → React/Vite · servido em /dashboard · consome /admin/api
```
Dois projetos, build/deploy independentes, unidos por reverse-proxy de mesma
origem em produção e por proxy do Vite em dev. Nada de backend dentro de
`/dashboard` nem de frontend dentro de `/api`.
