import { useQuery } from "@tanstack/react-query";
import { getCity, listCities } from "../lib/api";

// Catálogo da plataforma: não depende de período nem de cidade ativa.
export function useCities() {
  return useQuery({ queryKey: [ "cities" ], queryFn: listCities, staleTime: 30_000 });
}

// Ficha da cidade (módulo 16). Chave "city", separada de "cities": invalidar
// a lista não derruba a ficha que acabou de receber a resposta do PATCH.
export const cityKey = (id: string) => [ "city", id ] as const;

export function useCity(id: string) {
  return useQuery({ queryKey: cityKey(id), queryFn: () => getCity(id) });
}
