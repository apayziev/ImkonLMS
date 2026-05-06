/**
 * Auto-paginating helper for backend list endpoints.
 *
 * Backend caps `limit` (see app.core.pagination.MAX_LIMIT). Instead of
 * hard-coding caller-side limits that drift out of sync, walk pages until
 * the server returns fewer rows than requested.
 */

import type { AxiosResponse } from "axios";

/** Backend MAX_LIMIT — keep aligned with `app.core.pagination.MAX_LIMIT`. */
export const PAGE_SIZE = 100;

interface PageResponse<T> {
  data: T[];
  count: number;
}

type PageFetcher<T> = (
  skip: number,
  limit: number,
) => Promise<AxiosResponse<PageResponse<T>>>;

/**
 * Fetch every page from a paginated list endpoint and return aggregated data.
 *
 * Walks pages of size `pageSize` until a partial page is received. Uses the
 * server-reported `count` from the first page when available; falls back to the
 * aggregated length otherwise.
 */
export async function fetchAll<T>(
  fetchPage: PageFetcher<T>,
  pageSize: number = PAGE_SIZE,
): Promise<PageResponse<T>> {
  const all: T[] = [];
  let totalCount: number | null = null;
  let skip = 0;

  while (true) {
    const { data: page } = await fetchPage(skip, pageSize);
    all.push(...page.data);

    if (totalCount === null) {
      totalCount = page.count;
    }

    if (page.data.length < pageSize) break;
    skip += pageSize;

    // Defensive stop: avoid runaway loops if `count` is reliable.
    if (totalCount !== null && all.length >= totalCount) break;
  }

  return { data: all, count: totalCount ?? all.length };
}
