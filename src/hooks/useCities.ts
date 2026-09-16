import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "../lib/api";
import { useScope } from "../lib/scope";
import type { CitiesData } from "../lib/types";

// Cross-tenant (operador): envia só o período, nunca municipality_id.
export function useCities() {
  const scope = useScope();
  return useQuery({
    queryKey: [ "cities", scope.period ],
    queryFn: () => adminFetch<CitiesData>("/cities", { period: scope.period }),
    staleTime: 30_000
  });
}
