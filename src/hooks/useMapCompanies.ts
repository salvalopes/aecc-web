import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { mapApi } from '@/api/map.api';
import { ApiError } from '@/api/client';
import type { MapCompany } from '@/types/api';

/**
 * Pontos do mapa (GET /companies/map, mapa-plano W4). O filtro por categoria é o da API, com a
 * mesma semântica do diretório (`categoryId` exato). Respostas antigas são descartadas.
 */
export function useMapCompanies({ categoryId }: { categoryId?: string }) {
  const [points, setPoints] = useState<MapCompany[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await mapApi.companies({ categoryId: categoryId || undefined });
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
    } finally {
      if (requestId === requestIdRef.current) startTransition(() => setLoading(false));
    }
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  return { points, loaded, loading, error, reload: load };
}
