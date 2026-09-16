import { useQuery } from "@tanstack/react-query";
import { listCities } from "../lib/api";

// Catálogo da plataforma: não depende de período nem de cidade ativa.
export function useCities() {
  return useQuery({ queryKey: [ "cities" ], queryFn: listCities, staleTime: 30_000 });
}
