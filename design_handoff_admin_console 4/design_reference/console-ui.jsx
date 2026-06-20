// Rota Saúde · Admin Console — sober UI primitives (white/grey, technical).
// Standalone design language — does NOT reuse the warm product design system.
// Exports to window: AT, fmt, toneColor, ADot, ATag, ASource, AAsOf, APanel,
//   AStat, ASpark, ABars, AMeter, AStack, AFunnel, ACaveat, AEmpty, ASkeleton, ARule

const AT = {
  // cool neutral greys
  bg:        "oklch(98.4% 0.002 255)",   // app canvas
  panel:     "oklch(100% 0 0)",          // cards
  sunken:    "oklch(96.6% 0.003 255)",   // table head / code
  sunken2:   "oklch(94.6% 0.004 255)",
  rule:      "oklch(91.5% 0.004 255)",
  rule2:     "oklch(86% 0.005 255)",
  ink:       "oklch(26% 0.01 260)",
  ink2:      "oklch(46% 0.009 260)",
  ink3:      "oklch(61% 0.007 260)",
  ink4:      "oklch(72% 0.006 260)",
  accent:    "oklch(52% 0.14 264)",
  accentBg:  "oklch(95.5% 0.025 264)",
  ok:        "oklch(56% 0.11 155)",
  okBg:      "oklch(95% 0.04 155)",
  warn:      "oklch(64% 0.13 65)",
  warnBg:    "oklch(95.5% 0.045 75)",
  down:      "oklch(55% 0.18 27)",
  downBg:    "oklch(95.5% 0.05 27)",
  info:      "oklch(55% 0.11 245)",
  infoBg:    "oklch(95.5% 0.03 245)",
};

function toneColor(t) {
  return { ok: AT.ok, warn: AT.warn, down: AT.down, info: AT.info, accent: AT.accent, neutral: AT.ink3, urgent: AT.down }[t] || AT.ink3;
}
function toneBg(t) {
  return { ok: AT.okBg, warn: AT.warnBg, down: AT.downBg, info: AT.infoBg, accent: AT.accentBg, neutral: AT.sunken, urgent: AT.downBg }[t] || AT.sunken;
}
function fmt(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString("pt-BR");
}

// ---- status dot ----
function ADot({ level = "ok", size = 7, pulse = false }) {
  const c = toneColor(level);
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      {pulse && <span style={{ position: "absolute", inset: -2, borderRadius: 999, background: c, opacity: 0.28, animation: "acpulse 1.8s ease-out infinite" }} />}
      <span style={{ width: size, height: size, borderRadius: 999, background: c }} />
    </span>
  );
}

// ---- tag / badge ----
function ATag({ children, tone = "neutral", mono = true, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px", borderRadius: 5, fontSize: 11, lineHeight: 1.4, fontWeight: 600,
      letterSpacing: mono ? 0.2 : 0.1, whiteSpace: "nowrap",
      fontFamily: mono ? "var(--mono)" : "var(--sans)",
      color: toneColor(tone), background: toneBg(tone),
      border: `1px solid color-mix(in oklch, ${toneColor(tone)} 22%, transparent)`,
      ...style,
    }}>{children}</span>
  );
}

// ---- source badge: live vs projection (eventual consistency honesty) ----
function ASource({ kind = "live", at, compact = false }) {
  if (kind === "live") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ok, fontWeight: 600, letterSpacing: 0.3 }}>
        <ADot level="ok" size={6} pulse />ao vivo
      </span>
    );
  }
  return (
    <span title={`projeção · atualizada ${at || ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink3, fontWeight: 600, letterSpacing: 0.3 }}>
      <span style={{ display: "inline-flex", width: 9, height: 9, border: `1.4px solid ${AT.ink3}`, borderRadius: 999, position: "relative" }}>
        <span style={{ position: "absolute", left: 3, top: 1.4, width: 1.4, height: 3, background: AT.ink3 }} />
      </span>
      {compact ? "proj." : "projeção"}{at ? ` · ${at}` : ""}
    </span>
  );
}

// ---- per-panel as-of stamp ----
function AAsOf({ at, kind = "proj" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink3, letterSpacing: 0.2 }}>
      dados de <span style={{ color: AT.ink2, fontWeight: 600 }}>{at}</span>
      <ASource kind={kind} compact />
    </span>
  );
}

// ---- panel / card ----
function APanel({ title, sub, right, source, asOf, pad = true, children, style }) {
  return (
    <section style={{ background: AT.panel, border: `1px solid ${AT.rule}`, borderRadius: 10, display: "flex", flexDirection: "column", minWidth: 0, ...style }}>
      {(title || right) && (
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "13px 16px", borderBottom: `1px solid ${AT.rule}` }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 600, color: AT.ink, letterSpacing: -0.1 }}>{title}</div>}
            {sub && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink3, marginTop: 3, letterSpacing: 0.2 }}>{sub}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {asOf && <AAsOf at={asOf} kind={source || "proj"} />}
            {right}
          </div>
        </header>
      )}
      <div style={{ padding: pad ? 16 : 0, flex: 1, minWidth: 0 }}>{children}</div>
    </section>
  );
}

// ---- KPI stat tile ----
function AStat({ label, value, unit, delta, tone = "neutral", spark, source }) {
  return (
    <div style={{ background: AT.panel, border: `1px solid ${AT.rule}`, borderRadius: 10, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, minHeight: 30 }}>
        <span style={{ fontFamily: "var(--sans)", fontSize: 11.5, color: AT.ink2, fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
        {source && <span style={{ flexShrink: 0, marginTop: 1 }}><ASource kind={source} compact /></span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 27, fontWeight: 600, color: AT.ink, letterSpacing: -0.8, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: AT.ink3 }}>{unit}</span>}
        {delta && <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: toneColor(tone) }}>{delta}</span>}
      </div>
      {spark && <ASpark data={spark} color={toneColor(tone === "neutral" ? "accent" : tone)} h={26} />}
    </div>
  );
}

// ---- sparkline ----
function ASpark({ data = [], color = AT.accent, h = 28, fill = true }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const w = 100, span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 3) - 1.5]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={color} opacity="0.08" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---- mini bars ----
function ABars({ data = [], color = AT.accent, h = 40, highlight = -1 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: h }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(3, (v / max) * 100)}%`, background: i === highlight ? AT.down : color, opacity: i === highlight ? 1 : 0.82, borderRadius: "2px 2px 0 0" }} />
      ))}
    </div>
  );
}

// ---- linear meter ----
function AMeter({ label, used, max, unit = "", tone, h = 6, hint }) {
  const pct = Math.min(100, (used / max) * 100);
  const t = tone || (pct >= 85 ? "down" : pct >= 65 ? "warn" : "ok");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: AT.ink2 }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink2 }}>{hint || <>{fmt(used)}{unit} <span style={{ color: AT.ink4 }}>/ {fmt(max)}{unit}</span></>}</span>
      </div>
      <div style={{ height: h, background: AT.sunken2, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: toneColor(t), borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ---- stacked distribution bar (tier, ack, mode...) ----
function AStack({ segments, h = 12, showLegend = true }) {
  const total = segments.reduce((a, s) => a + s.count, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", height: h, borderRadius: 999, overflow: "hidden", background: AT.sunken2, gap: 2 }}>
        {segments.map((s) => (
          <div key={s.key || s.code || s.label} title={`${s.label}: ${fmt(s.count)}`} style={{ width: `${(s.count / total) * 100}%`, background: toneColor(s.tone), minWidth: s.count ? 3 : 0 }} />
        ))}
      </div>
      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
          {segments.map((s) => (
            <div key={(s.key || s.code || s.label) + "l"} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: toneColor(s.tone) }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink2 }}>{s.label}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink, fontWeight: 600 }}>{fmt(s.count)}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4 }}>{Math.round((s.count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- funnel (horizontal bars w/ step-to-step retention) ----
function AFunnel({ steps }) {
  const top = steps[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => {
        const pct = (s.count / top) * 100;
        return (
          <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink2 }}>{s.label}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink, fontWeight: 600 }}>{fmt(s.count)} <span style={{ color: AT.ink4, fontWeight: 400 }}>{Math.round(pct)}%</span></span>
            </div>
            <div style={{ height: 22, background: AT.sunken2, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: toneColor(s.tone), opacity: 0.85, borderRadius: 6 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- honest caveat callout ----
function ACaveat({ title = "Limitação conhecida", children, tone = "warn" }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "13px 15px", borderRadius: 10, background: toneBg(tone), border: `1px solid color-mix(in oklch, ${toneColor(tone)} 28%, transparent)` }}>
      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 999, border: `1.6px solid ${toneColor(tone)}`, color: toneColor(tone), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, marginTop: 1 }}>!</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 700, color: AT.ink, marginBottom: 3 }}>{title}</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.5, color: AT.ink2, textWrap: "pretty" }}>{children}</div>
      </div>
    </div>
  );
}

// ---- empty / skeleton states ----
function AEmpty({ icon = "∅", title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "30px 16px", textAlign: "center" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 22, color: AT.ink4 }}>{icon}</span>
      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: AT.ink2 }}>{title}</div>
      {sub && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4, maxWidth: 320, textWrap: "pretty" }}>{sub}</div>}
    </div>
  );
}
function ASkeleton({ rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 14, borderRadius: 5, background: `linear-gradient(90deg, ${AT.sunken} 0%, ${AT.sunken2} 50%, ${AT.sunken} 100%)`, backgroundSize: "200% 100%", animation: "acshimmer 1.4s ease-in-out infinite", width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}

function ARule({ vertical, style }) {
  return <div style={{ background: AT.rule, [vertical ? "width" : "height"]: 1, [vertical ? "height" : "width"]: "100%", ...style }} />;
}

Object.assign(window, { AT, fmt, toneColor, toneBg, ADot, ATag, ASource, AAsOf, APanel, AStat, ASpark, ABars, AMeter, AStack, AFunnel, ACaveat, AEmpty, ASkeleton, ARule });
