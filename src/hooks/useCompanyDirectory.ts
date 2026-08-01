import { useEffect, useRef, useState, startTransition } from 'react';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { CompanyDirectoryEntry } from '@/types/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface UseCompanyDirectoryParams {
  search: string;
  categoryId?: string;
}

export function useCompanyDirectory({ search, categoryId }: UseCompanyDirectoryParams) {
  const [entries, setEntries] = useState<CompanyDirectoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const isFirstRunRef = useRef(true);

  async function loadPage(pageToLoad: number, name: string, replace: boolean) {
    const requestId = ++requestIdRef.current;
    if (replace) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const result = await companiesApi.directory({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        name: name || undefined,
        categoryId,
      });
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        setEntries(prev => (replace ? result.items : [...prev, ...result.items]));
        setPage(result.page);
        setTotalPages(result.totalPages);
      });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresas.')
      );
    } finally {
      if (requestId === requestIdRef.current) {
        startTransition(() => {
          setLoading(false);
          setLoadingMore(false);
        });
      }
    }
  }

  useEffect(() => {
    const name = search.trim();
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      loadPage(1, name, true);
      return;
    }
    const handle = setTimeout(() => {
      loadPage(1, name, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId]);

  function loadMore() {
    if (loading || loadingMore) return;
    if (page >= totalPages) return;
    loadPage(page + 1, search.trim(), false);
  }

  function reload() {
    loadPage(1, search.trim(), true);
  }

  return { entries, loading, loadingMore, error, page, totalPages, loadMore, reload };
}
