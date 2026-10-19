// Identidade da cidade: brasão e nome oficial do órgão de saúde que o login do
// dashboard e o app do cidadão mostram. O api decide; a checagem local só evita
// uma ida ao servidor.

import { ApiError, apiErrorCode } from "./api";
import type { CityDetail } from "./types";

export const COAT_MAX_BYTES = 262_144;
export const COAT_MIN_SIDE = 128;
export const COAT_MAX_SIDE = 1024;
const COAT_TYPES = [ "image/png", "image/webp" ];

const MESSAGES: Record<string, string> = {
  invalid_format: "Use PNG ou WebP.",
  too_large: "Até 256 KB.",
  invalid_dimensions: "Entre 128 e 1024 px.",
  invalid_health_department_name: "Até 120 caracteres."
};

export function describeIdentityError(err: unknown): string {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return "Não foi possível salvar a identidade. Tente de novo.";
}

export interface CityIdentityPatch {
  healthDepartmentName?: string;
  coatOfArms?: File;
  removeCoatOfArms?: boolean;
}

export async function updateCityIdentity(cityId: string, patch: CityIdentityPatch): Promise<CityDetail> {
  const body = new FormData();
  if (patch.healthDepartmentName !== undefined) body.append("health_department_name", patch.healthDepartmentName);
  if (patch.coatOfArms) body.append("coat_of_arms", patch.coatOfArms);
  if (patch.removeCoatOfArms) body.append("remove_coat_of_arms", "true");
  // Sem Content-Type: o navegador põe o boundary do multipart.
  const res = await fetch(`/cities/${encodeURIComponent(cityId)}/identity`, {
    method: "PATCH",
    credentials: "include",
    headers: { Accept: "application/json" },
    body
  });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
  if (!res.ok) throw new ApiError(res.status, parsed, `HTTP ${res.status}`);
  return (parsed as { city: CityDetail }).city;
}

export async function checkCoatOfArmsFile(file: File): Promise<string | null> {
  if (!COAT_TYPES.includes(file.type)) return MESSAGES.invalid_format;
  if (file.size > COAT_MAX_BYTES) return MESSAGES.too_large;
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    bmp.close?.();
    if (Math.min(width, height) < COAT_MIN_SIDE || Math.max(width, height) > COAT_MAX_SIDE) return MESSAGES.invalid_dimensions;
    return null;
  } catch {
    return MESSAGES.invalid_format;
  }
}
