import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Página pública (sem auth) que o convidado abre pelo link do e-mail.
// URL esperado: /admin/?invite=<token>
// POST /setup/accept_invitation { token, password } → cria User + Identity +
// Membership + abre sessão.
import { useState } from "react";
import { setupAcceptInvitation, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
export function AcceptInvitation({ token, onCancel }) {
    const { reload } = useAuth();
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    async function submit(e) {
        e.preventDefault();
        if (password.length < 12) {
            setError("Senha precisa de ao menos 12 caracteres.");
            return;
        }
        if (password !== confirmation) {
            setError("Senhas não conferem.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await setupAcceptInvitation(token, password);
            await reload();
            setDone(true);
        }
        catch (err) {
            if (err instanceof ApiError && err.status === 422) {
                setError("Convite inválido ou expirado.");
            }
            else {
                setError(err.message);
            }
        }
        finally {
            setBusy(false);
        }
    }
    if (done) {
        return (_jsx(Center, { children: _jsx(Card, { children: _jsx("div", { style: { padding: "10px 12px", borderRadius: 8, background: "var(--up-bg)", color: "var(--up)", fontSize: 13 }, children: "\u2713 Conta criada. Voc\u00EA j\u00E1 est\u00E1 autenticado." }) }) }));
    }
    return (_jsx(Center, { children: _jsx(Card, { children: _jsxs("form", { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsx("h2", { style: { margin: 0, fontSize: 16, fontWeight: 600 }, children: "Aceitar convite" }), _jsx("p", { style: { fontSize: 12, color: "var(--ink3)", margin: 0 }, children: "Defina uma senha para criar sua conta no Rota Sa\u00FAde." }), _jsx(Field, { label: "Senha (m\u00EDn. 12 caracteres)", type: "password", value: password, onChange: setPassword, autoComplete: "new-password" }), _jsx(Field, { label: "Confirmar senha", type: "password", value: confirmation, onChange: setConfirmation, autoComplete: "new-password" }), error && (_jsx("div", { role: "alert", style: { padding: "8px 10px", borderRadius: 6, background: "var(--down-bg)", color: "var(--down)", fontSize: 12 }, children: error })), _jsx("button", { type: "submit", disabled: busy || !password || !confirmation, style: btnPrimary(busy || !password || !confirmation), children: busy ? "Criando…" : "Criar conta" }), _jsx("button", { type: "button", onClick: onCancel, style: btnGhost, children: "Cancelar" })] }) }) }));
}
function Center({ children }) {
    return _jsx("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }, children: children });
}
function Card({ children }) {
    return _jsx("div", { style: { background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: "var(--radius-panel)", padding: 22, width: "100%", maxWidth: 420 }, children: children });
}
function Field({ label, type, value, onChange, autoComplete }) {
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { className: "mono", style: { fontSize: 10.5, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6 }, children: label }), _jsx("input", { type: type, value: value, autoComplete: autoComplete, onChange: (e) => onChange(e.target.value), style: inputStyle })] }));
}
const inputStyle = {
    padding: "9px 10px", fontSize: 13, fontFamily: "var(--font-sans)",
    color: "var(--ink)", background: "var(--panel)",
    border: "1px solid var(--rule2)", borderRadius: 8, outline: "none"
};
function btnPrimary(disabled) {
    return {
        padding: "10px 12px", borderRadius: 8, border: "none",
        background: disabled ? "var(--ink3)" : "var(--ink)",
        color: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1
    };
}
const btnGhost = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid var(--rule2)",
    background: "transparent", color: "var(--ink2)",
    fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer"
};
