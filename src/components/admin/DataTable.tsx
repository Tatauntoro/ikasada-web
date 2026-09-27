import { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyState?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-black/[0.08]">
      <table className="w-full text-sm text-left">
        <thead className="bg-[#f2f2f4] text-[#0f1012] text-xs uppercase font-bold">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05] bg-[#fdfdfd]">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="hover:bg-black/[0.04] transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-4 whitespace-nowrap ${col.className ?? ""}`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
