import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend do Admin Console. Em dev:
//   VITE_ADMIN_API_BASE (default "/admin/api") → roteado via proxy para o Rails.
//   Rails dev sobe em :3030 (apps/api do docker-compose).
export default defineConfig({
  plugins: [react()],
  base: "/dashboard/",
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/admin/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3030",
        changeOrigin: true
      },
      "/session": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3030",
        changeOrigin: true
      }
    }
  }
});
