import { useState, useCallback } from 'react';

/**
 * usePagination — manages page/limit state for paginated API calls.
 *
 * @param {number} initialLimit - Items per page (default 10)
 * @returns {{ page, limit, totalPages, setTotalPages, nextPage, prevPage, goToPage, reset }}
 *
 * Usage:
 *   const { page, limit, totalPages, setTotalPages, nextPage, prevPage } = usePagination(10);
 *   // pass { page, limit } to your API call
 *   // set totalPages from the API response
 */
const usePagination = (initialLimit = 10) => {
  const [page, setPage]             = useState(1);
  const [limit]                     = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback(
    (n) => setPage(Math.max(1, Math.min(n, totalPages))),
    [totalPages]
  );

  const reset = useCallback(() => setPage(1), []);

  return { page, limit, totalPages, setTotalPages, nextPage, prevPage, goToPage, reset };
};

export default usePagination;
