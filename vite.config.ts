import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend do Admin Console + setup multi-tenant. Em dev:
//   VITE_ADMIN_API_BASE (default "/admin/api") → roteado via proxy para Rails.
//   Rails dev sobe em :3030 (apps/api do docker-compose).
//
// Caminhos backend proxados (ADR-0022 + ADR-0023):
//   /session, /session/challenge   → SessionsController
//   /mfa/*                          → MfaController
//   /setup/*                        → SetupController (provision, invite, etc)
//   /auth/govbr/callback            → SessionsController#govbr_callback
//   /admin/api/*                    → Admin::Api::* (read-only)
const proxy = (target: string) => ({ target, changeOrigin: true });

export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/admin/api": proxy(process.env.VITE_API_PROXY_TARGET || "http://localhost:3030"),
      "/session":   proxy(process.env.VITE_API_PROXY_TARGET || "http://localhost:3030"),
      "/mfa":       proxy(process.env.VITE_API_PROXY_TARGET || "http://localhost:3030"),
      "/setup":     proxy(process.env.VITE_API_PROXY_TARGET || "http://localhost:3030"),
      "/auth":      proxy(process.env.VITE_API_PROXY_TARGET || "http://localhost:3030")
    }
  }
});
