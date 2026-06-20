# DESIGN_TOKENS.md — Rota Saúde · Admin Console

Tokens extraídos de `design_reference/console-ui.jsx` (objeto `AT`) e do
`<style>` de `Rota Saúde · Admin Console.html`. Estética: **console técnico
sóbrio, branco/cinza frio**, distinto da marca quente do produto cidadão.

> Cores em **oklch** (como no protótipo). Se `packages/ui` usa hex/HSL, converta;
> os valores RGB aproximados estão entre parênteses para conferência.

## Cores — neutros (cool grey)

| Token | oklch | ~hex | Uso |
|---|---|---|---|
| `bg`      | `oklch(98.4% 0.002 255)` | `#f7f8f9` | canvas do app |
| `panel`   | `oklch(100% 0 0)`        | `#ffffff` | cards / superfícies |
| `sunken`  | `oklch(96.6% 0.003 255)` | `#f1f3f4` | head de tabela, code, chips |
| `sunken2` | `oklch(94.6% 0.004 255)` | `#ebedef` | trilho de barras/meter |
| `rule`    | `oklch(91.5% 0.004 255)` | `#e2e5e8` | bordas / divisores |
| `rule2`   | `oklch(86% 0.005 255)`   | `#d2d6da` | bordas mais fortes |
| `ink`     | `oklch(26% 0.01 260)`    | `#272b33` | texto principal |
| `ink2`    | `oklch(46% 0.009 260)`   | `#5a606b` | texto secundário |
| `ink3`    | `oklch(61% 0.007 260)`   | `#838893` | texto terciário / mono labels |
| `ink4`    | `oklch(72% 0.006 260)`   | `#a3a7b0` | hint / placeholder |

## Cores — semânticas (mesma croma/lightness, hue variável)

| Token | oklch | ~hex | Bg companion |
|---|---|---|---|
| `accent` | `oklch(52% 0.14 264)` | `#3b5bdb` (índigo) | `accentBg oklch(95.5% 0.025 264)` |
| `ok`     | `oklch(56% 0.11 155)` | `#1f8a5b` (verde)  | `okBg oklch(95% 0.04 155)` |
| `warn`   | `oklch(64% 0.13 65)`  | `#b8860b` (âmbar)  | `warnBg oklch(95.5% 0.045 75)` |
| `down`   | `oklch(55% 0.18 27)`  | `#d2453a` (vermelho)| `downBg oklch(95.5% 0.05 27)` |
| `info`   | `oklch(55% 0.11 245)` | `#3a78c2` (azul)   | `infoBg oklch(95.5% 0.03 245)` |

`tone` → cor: `ok|warn|down|info|accent|neutral(=ink3)|urgent(=down)`.

## Tipografia

- **Sans:** `"Geist"` (fallback: -apple-system, Segoe UI, Roboto, sans-serif).
- **Mono:** `"Geist Mono"` (fallback: ui-monospace, SF Mono, Menlo).
  Mono é usado para **todo dado numérico/tabular**, IDs, timestamps, labels de
  seção e badges — reforça o ar de console.
- Carregadas via Google Fonts no protótipo. No app, use as fontes equivalentes
  já disponíveis ou registre Geist.

### Escala de tamanhos (px) — **piso de 10.5px**

| px / peso | Uso |
|---|---|
| **27 / 600** mono | valor de KPI (`AStat`) |
| **20 / 700** sans | título da página (h1) |
| 14 / 600 | valor em `AKV` |
| 13.5 / 600 | título de painel |
| 13 / 700 | título do menu de notificações |
| 12.5 / 500–600 | itens de nav, corpo de alerta |
| 12 mono | células de tabela, subtítulo de painel, valores |
| 11.5 | rótulo de KPI |
| 11 mono | valores secundários, controles de período/clock |
| 10.5 mono | tags/badges, subtítulos, "dados de", source, cabeçalho de tabela (uppercase) |

> 10.5px é o **menor** tamanho do sistema. Não desça abaixo disso.

## Raio, sombra, espaçamento

| Token | Valor |
|---|---|
| Raio painel/card | `10px` |
| Raio menu/dropdown | `12px` |
| Raio botão/tag/chip | `5–8px` |
| Raio pill/dot | `999px` |
| Sombra dropdown | `0 8px 28px -8px rgba(20,20,40,.22), 0 2px 6px rgba(20,20,40,.06)` |
| Sombra menu notificações | `0 14px 40px -10px rgba(20,20,40,.26), 0 3px 8px rgba(20,20,40,.07)` |
| Gap padrão entre painéis | `14–16px` |
| Padding interno de painel | `16px` |
| Padding header de painel | `13px 16px` |
| Largura navbar (conteúdo) | fluido, 100% (sem max-width) |
| Padding de conteúdo | `22px 32px 48px` (confortável) / `18px 26px 40px` (compacta, `zoom .94`) |

## Animações

```css
@keyframes acpulse  { 0%{transform:scale(1);opacity:.4} 70%{transform:scale(2.4);opacity:0} 100%{opacity:0} }
@keyframes acshimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
```
- `acpulse`: halo do dot "ao vivo" (1.8s, infinito).
- `acshimmer`: skeleton de loading (1.4s).
- Dropdown chevron: `transform .15s ease`. Sidebar/transições de largura: `.18s ease`.

## Scrollbar (webkit)

Slim, 9px, thumb `oklch(86% 0.005 255)` com track transparente.
