// Mensagens de erro do registro de canal (POST /cities/:id/channel, Plano 8).
// Espelha o padrão de provisioning.ts: lógica pura, testada, para a tela
// (RegisterChannel.tsx) ficar fina.

import { ApiError } from "./api";

export function describeChannelError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "cidade não encontrada";
    if (err.status === 422) {
      const body = err.body as { error?: string; message?: string } | undefined;
      if (body?.error === "city_not_servable") return "a cidade não está ativa";
      return body?.message || "dados inválidos";
    }
  }
  return (err as Error).message;
}
