// Reusable pagination hook for infinite scroll and load more patterns

import { useState, useCallback } from 'react';

export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface PaginationState<T> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
}

export interface PaginationActions<T> {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  setData: (data: T[]) => void;
}

export type UsePaginationReturn<T> = PaginationState<T> & PaginationActions<T>;

/**
 * A reusable pagination hook for implementing infinite scroll or load more patterns.
 *
 * @param fetchFunction - Async function that fetches a page of data. Receives (limit, offset) and returns items.
 * @param options - Configuration options including pageSize and initialPage
 * @returns Pagination state and actions
 *
 * @example
 * ```typescript
 * const fetchClaims = async (limit: number, offset: number) => {
 *   return await getClaims(userId, limit, offset);
 * };
 *
 * const { data, loading, hasMore, loadMore, refresh } = usePagination(fetchClaims, {
 *   pageSize: 20
 * });
 * ```
 */
export function usePagination<T>(
  fetchFunction: (limit: number, offset: number) => Promise<T[]>,
  options: PaginationOptions = {}
): UsePaginationReturn<T> {
  const { pageSize = 20, initialPage = 0 } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the next page of data and appends it to existing data
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      const offset = page * pageSize;
      const newItems = await fetchFunction(pageSize, offset);

      if (newItems.length < pageSize) {
        setHasMore(false);
      }

      setData((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to load more data');
      console.error('Pagination loadMore error:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, pageSize, fetchFunction]);

  /**
   * Refreshes data by resetting to the first page
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const newItems = await fetchFunction(pageSize, 0);

      setData(newItems);
      setPage(1);
      setHasMore(newItems.length >= pageSize);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh data');
      console.error('Pagination refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [pageSize, fetchFunction]);

  /**
   * Resets pagination state to initial values
   */
  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return {
    // State
    data,
    loading,
    refreshing,
    hasMore,
    page,
    error,
    // Actions
    loadMore,
    refresh,
    reset,
    setData,
  };
}
