import { useMemo, useState } from 'react';
import { CATEGORIES, TOTAL_COUNT, filterCompanies, findCategory } from './data';
import type { ProtoCompany, ProtoState, ViewMode } from './types';

export interface ModelInit {
  state: ProtoState;
  q: string;
  cat: string | null;
  view: ViewMode;
}

export function topLevelOf(catId: string | null): string | null {
  if (!catId) return null;
  const top = CATEGORIES.find((c) => c.id === catId || c.children.some((x) => x.id === catId));
  return top?.id ?? null;
}

export interface DirectoryModel {
  mode: ProtoState;
  q: string;
  setQ: (v: string) => void;
  cat: string | null;
  setCat: (v: string | null) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  /** Lista a mostrar: em erro mostra-se a última lista carregada (sem filtros). */
  items: ProtoCompany[];
  loading: boolean;
  error: boolean;
  empty: boolean;
  totalLabel: string;
  categoryName: string | null;
  clearFilters: () => void;
  retry: () => void;
}

export function useDirectoryModel(init: ModelInit): DirectoryModel {
  const [mode, setMode] = useState<ProtoState>(init.state);
  const [q, setQ] = useState(init.q);
  const [cat, setCat] = useState<string | null>(init.cat);
  const [view, setView] = useState<ViewMode>(init.view);

  const filtered = useMemo(() => filterCompanies(q, cat), [q, cat]);
  const loading = mode === 'loading';
  const error = mode === 'error';
  const items = error ? filterCompanies('', null) : filtered;
  const empty = !loading && !error && filtered.length === 0;
  const filtering = !!q.trim() || !!cat;
  const n = filtering ? filtered.length : TOTAL_COUNT;

  return {
    mode,
    q,
    setQ: (v) => {
      setQ(v);
      if (mode !== 'normal') setMode('normal');
    },
    cat,
    setCat: (v) => {
      setCat(v);
      if (mode !== 'normal') setMode('normal');
    },
    view,
    setView,
    items,
    loading,
    error,
    empty,
    totalLabel: loading
      ? 'A carregar…'
      : `${n} ${n === 1 ? 'empresa' : 'empresas'}${filtering ? '' : ' associadas'}`,
    categoryName: findCategory(cat)?.name ?? null,
    clearFilters: () => {
      setQ('');
      setCat(null);
      setMode('normal');
    },
    retry: () => setMode('normal'),
  };
}
