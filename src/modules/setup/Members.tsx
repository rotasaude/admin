// Memberships da cidade ativa: lista + invite + revoke.

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  setupListMemberships, setupInviteMember, setupRevokeMembership, ApiError,
  type MembershipRow, type InviteResult
} from "../../lib/api";
import { useAuth } from "../../lib/auth";

const ROLES = [
  "viewer", "protocol_author", "municipal_admin", "protocol_publisher"
];

export function Members() {
  const { user, activeMunicipalityId } = useAuth();
  const qc = useQueryClient();
  const [ inviteEmail, setInviteEmail ] = useState("");
  const [ inviteRole, setInviteRole ] = useState<string>("municipal_admin");
  const [ inviteResult, setInviteResult ] = useState<InviteResult | null>(null);
  const [ inviteBusy, setInviteBusy ] = useState(false);
  const [ inviteError, setInviteError ] = useState<string | null>(null);

  const muniId = activeMunicipalityId || undefined;

  const list = useQuery({
    queryKey: [ "memberships", muniId ],
    queryFn: () => setupListMemberships(muniId)
  });

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    if (!muniId && !user?.operator) {
      setInviteError("Selecione uma cidade para convidar.");
      return;
    }
    setInviteBusy(true);
    setInviteError(null);
    try {
      const inv = await setupInviteMember({ email: inviteEmail, role: inviteRole, municipality_id: muniId });
      setInviteResult(inv);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: [ "memberships", muniId ] });
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string; message?: string } | null;
        setInviteError(body?.message || body?.error || `Erro ${err.status}`);
      } else {
        setInviteError((err as Error).message);
      }
    } finally {
      setInviteBusy(false);
    }
  }

  async function revoke(m: MembershipRow) {
    if (!confirm(`Revogar membership de ${m.user.email_address} (${m.role})?`)) return;
    try {
      await setupRevokeMembership(m.id);
      qc.invalidateQueries({ queryKey: [ "memberships", muniId ] });
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Memberships</h1>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Convidar</h2>
        <form onSubmit={submitInvite} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
            <label className="mono" style={labelStyle}>E-mail</label>
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="mono" style={labelStyle}>Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={inviteBusy} style={btnPrimary(inviteBusy)}>
            {inviteBusy ? "Enviando…" : "Enviar convite"}
          </button>
        </form>
        {inviteError && (
          <div role="alert" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }}>{inviteError}</div>
        )}
        {inviteResult && (
          <div style={{ padding: "8px 10px", borderRadius: 6, background: "var(--up-bg)", color: "var(--up)", fontSize: 12 }}>
            ✓ Convite #{inviteResult.id.slice(0, 8)} para {inviteResult.email} (expira {new Date(inviteResult.expires_at).toLocaleString("pt-BR")}).
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Ativos</h2>
        {list.isLoading && <div style={{ fontSize: 12, color: "var(--ink3)" }}>Carregando…</div>}
        {list.isError && <div style={{ fontSize: 12, color: "var(--down)" }}>Falha ao carregar: {(list.error as Error).message}</div>}
        {list.data && list.data.length === 0 && <div style={{ fontSize: 12, color: "var(--ink3)" }}>Nenhum membership ativo.</div>}
        {list.data && list.data.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink3)", fontSize: 11 }}>
                <th style={th}>E-mail</th>
                <th style={th}>Role</th>
                <th style={th}>Desde</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid var(--rule2)" }}>
                  <td style={td}>{m.user.email_address}</td>
                  <td style={td}><code style={{ fontSize: 11 }}>{m.role}</code></td>
                  <td style={td}>{new Date(m.granted_at).toLocaleDateString("pt-BR")}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button onClick={() => revoke(m)} style={btnGhost}>Revogar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--panel)", border: "1px solid var(--rule)",
  borderRadius: "var(--radius-panel)", padding: 16,
  display: "flex", flexDirection: "column", gap: 12
};

const labelStyle: React.CSSProperties = {
  fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6
};

const inputStyle: React.CSSProperties = {
  padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
  color: "var(--ink)", background: "var(--panel)",
  border: "1px solid var(--rule2)", borderRadius: 8, outline: "none"
};

const th: React.CSSProperties = { padding: "8px 6px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "8px 6px" };

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 12px", borderRadius: 8, border: "none",
    background: disabled ? "var(--ink3)" : "var(--ink)",
    color: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1
  };
}

const btnGhost: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "transparent", color: "var(--ink2)",
  fontFamily: "var(--font-sans)", fontSize: 11.5, cursor: "pointer"
};
