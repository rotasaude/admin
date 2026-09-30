// Sparkline — linha + área. Recharts AreaChart sem eixos.
// `null` é lacuna (semana oculta ou sem dado no Analytics), nunca zero.
import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface Props {
  data: (number | null)[];
  color?: string;
  h?: number;
}

// Ponto isolado: número cujos vizinhos são lacuna (ou borda). Sem ponto, o
// traço tem comprimento zero e some; é o caso de séries com "oculto" alternado.
export function isolatedPoints(data: (number | null)[]): boolean[] {
  return data.map(
    (v, i) =>
      typeof v === "number" &&
      (i === 0 || data[i - 1] === null) &&
      (i === data.length - 1 || data[i + 1] === null)
  );
}

export function Sparkline({ data, color = "var(--accent)", h = 32 }: Props) {
  const gradientId = `spark-fill-${useId().replace(/:/g, "")}`;
  if (!data || data.every((v) => v === null)) return <div style={{ height: h }} />;
  const isolated = isolatedPoints(data);
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.4}
            fill={`url(#${gradientId})`}
            dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) =>
              index !== undefined && isolated[index] && cx !== undefined && cy !== undefined ? (
                <circle key={index} cx={cx} cy={cy} r={1.5} fill={color} />
              ) : (
                <g key={index} />
              )
            }
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
