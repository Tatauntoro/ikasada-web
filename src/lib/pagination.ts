export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 100;

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

function parseNumber(
  value: string | null | undefined,
  fallback: number
): number {
  if (value === null || value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return parsed;
}

export function parsePagination(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults: Partial<Pick<Pagination, "page" | "limit">> = {}
): Pagination {
  const rawPage =
    searchParams instanceof URLSearchParams
      ? searchParams.get("page")
      : searchParams["page"];

  const rawLimit =
    searchParams instanceof URLSearchParams
      ? searchParams.get("limit")
      : searchParams["limit"];

  const page = Math.max(1, parseNumber(rawPage?.toString(), defaults.page ?? DEFAULT_PAGE));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseNumber(rawLimit?.toString(), defaults.limit ?? DEFAULT_LIMIT))
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}
