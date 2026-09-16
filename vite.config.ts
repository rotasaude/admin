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
//   /admin/api/*                    → Admin::Api::* (read-only)
//   /cities/*, /city_grants/*       → gestão de cidades e grants (Task 4)
const proxy = (target: string) => ({ target, changeOrigin: false });
const TARGET = process.env.VITE_API_PROXY_TARGET || "http://localhost:3030";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: [ ".localhost" ],
    proxy: {
      "/admin/api": proxy(TARGET),
      "/session":   proxy(TARGET),
      "/mfa":       proxy(TARGET),
      "/setup":     proxy(TARGET),
      "/cities":    proxy(TARGET),
      "/city_grants": proxy(TARGET)
    }
  }
});
