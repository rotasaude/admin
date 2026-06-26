import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "../lib/api";
import { useScope } from "../lib/scope";
import type { CityDetailData } from "../lib/types";

export function useCityDetail(id: string | null) {
  const scope = useScope();
  return useQuery({
    queryKey: [ "city", id, scope.period ],
    queryFn: () => adminFetch<CityDetailData>(`/cities/${id}`, { period: scope.period }),
    enabled: !!id,
    staleTime: 30_000
  });
}
