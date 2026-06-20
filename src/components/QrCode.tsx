// Renderiza um QR code SVG (sem fetch externo). Wrap mínimo do `qrcode`.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220, alt = "QR code" }: { value: string; size?: number; alt?: string }) {
  const [ svg, setSvg ] = useState<string | null>(null);
  const [ err, setErr ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, width: size, errorCorrectionLevel: "M" })
      .then((s) => { if (!cancelled) setSvg(s); })
      .catch((e) => { if (!cancelled) setErr((e as Error).message); });
    return () => { cancelled = true; };
  }, [ value, size ]);

  if (err) return <div style={{ fontSize: 11, color: "var(--down)" }}>QR error: {err}</div>;
  if (!svg) return <div style={{ width: size, height: size, background: "var(--bg)", border: "1px solid var(--rule2)", borderRadius: 8 }} aria-label={alt} />;

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: size,
        height: size,
        padding: 8,
        background: "#fff",
        border: "1px solid var(--rule2)",
        borderRadius: 8,
        display: "inline-block",
        lineHeight: 0
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
