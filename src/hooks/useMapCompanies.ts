import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { mapApi } from '@/api/map.api';
import { ApiError } from '@/api/client';
import type { MapCompany } from '@/types/api';

/**
 * Pontos do mapa (GET /companies/map, sem filtro). O filtro por categoria e as contagens fazem-se
 * no cliente, a partir desta única resposta (decisão 5 da Fase B, `mapFilter.ts`). Respostas
 * antigas (de um "Tentar de novo" anterior) são descartadas.
 */
export function useMapCompanies() {
  const [points, setPoints] = useState<MapCompany[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setError(null);
    try {
      const result = await mapApi.companies();
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        setPoints(result);
        setLoaded(true);
      });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar o mapa.'),
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { points, loaded, error, reload: load };
}
