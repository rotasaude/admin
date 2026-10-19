// Identidade da cidade (nome oficial do órgão de saúde + brasão), mostrada no
// login do dashboard e no app do cidadão. A prévia é do arquivo escolhido
// (blob local); o brasão já salvo é servido no host da cidade, que o console
// não conhece, então aqui só se informa que existe.

import { useEffect, useState, type FormEvent } from "react";
import type { CityDetail } from "../../lib/types";
import { checkCoatOfArmsFile, describeIdentityError, updateCityIdentity, type CityIdentityPatch } from "../../lib/cityIdentity";

interface Props {
  city: CityDetail;
  onSaved: (city: CityDetail) => void;
}

export function CityIdentityForm({ city, onSaved }: Props) {
  const [ base, setBase ] = useState(city);
  const [ name, setName ] = useState(city.health_department_name ?? "");
  const [ file, setFile ] = useState<File | null>(null);
  const [ preview, setPreview ] = useState<string | null>(null);
  const [ remove, setRemove ] = useState(false);
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ notice, setNotice ] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ file ]);

  async function choose(f: File | undefined) {
    setNotice(null);
    if (!f) return;
    const problem = await checkCoatOfArmsFile(f);
    if (problem) { setError(problem); return; }
    setError(null);
    setFile(f);
    setRemove(false);
  }

  function removeCoat() {
    setNotice(null);
    setError(null);
    setFile(null);
    setRemove(base.coat_of_arms_url != null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const patch: CityIdentityPatch = {};
    if (name !== (base.health_department_name ?? "")) patch.healthDepartmentName = name;
    if (file) patch.coatOfArms = file;
    else if (remove) patch.removeCoatOfArms = true;
    if (Object.keys(patch).length === 0) { setNotice("Nada mudou."); return; }
    setBusy(true);
    try {
      const updated = await updateCityIdentity(city.id, patch);
      setBase(updated);
      setName(updated.health_department_name ?? "");
      setFile(null);
      setRemove(false);
      setNotice("Salvo.");
      onSaved(updated);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setBusy(false);
    }
  }

  const hasSaved = base.coat_of_arms_url != null && !remove;
  const hasCoat = file !== null || hasSaved;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="mono" style={labelStyle}>Nome do órgão de saúde · até 120 caracteres</span>
        <input value={name} onChange={(e) => { setName(e.target.value); setNotice(null); }} disabled={busy} style={inputStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="mono" style={labelStyle}>Brasão · PNG ou WebP, até 256 KB, 128 a 1024 px</span>
        <input
          type="file"
          accept="image/png,image/webp"
          disabled={busy}
          onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }}
          style={inputStyle}
        />
      </label>

      {preview && (
        <img
          src={preview}
          alt="Prévia do brasão"
          style={{ maxHeight: 96, maxWidth: 96, objectFit: "contain", background: "var(--panel)", border: "1px solid var(--rule2)", borderRadius: 8, padding: 8 }}
        />
      )}
      {!preview && hasSaved && <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>Brasão cadastrado.</p>}
      {hasCoat && (
        <div>
          <button type="button" onClick={removeCoat} disabled={busy} style={btnGhost}>Remover brasão</button>
        </div>
      )}

      {error && <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>{error}</div>}
      {notice && <div role="status" style={{ fontSize: 12, color: "var(--ink2)" }}>{notice}</div>}

      <button type="submit" disabled={busy} style={btnPrimary(busy)}>{busy ? "Salvando…" : "Salvar identidade"}</button>
    </form>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 };

const inputStyle: React.CSSProperties = {
  padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
  color: "var(--ink)", background: "var(--panel)",
  border: "1px solid var(--rule2)", borderRadius: 8
};

const btnGhost: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "var(--panel)", color: "var(--ink)", fontSize: 13, cursor: "pointer"
};

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px", borderRadius: 8, border: "none",
    background: disabled ? "var(--ink3)" : "var(--ink)",
    color: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1
  };
}
