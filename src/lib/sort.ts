export type SortDirection = "asc" | "desc";

export type Sort = {
  field: string;
  direction: SortDirection;
};

export function parseSort(
  sort: string | null | undefined,
  sortableFields: readonly string[],
  defaultField: string,
  defaultDirection: SortDirection = "desc"
): Sort {
  const fallback: Sort = { field: defaultField, direction: defaultDirection };

  if (!sort) return fallback;

  const [field, direction] = sort.split(":");
  if (!sortableFields.includes(field)) return fallback;
  if (direction !== "asc" && direction !== "desc") return fallback;

  return { field, direction };
}
