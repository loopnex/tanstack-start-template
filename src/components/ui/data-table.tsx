import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

// Table Props Interface
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
}

export const DataTable = <TData, TValue>({
  columns,
  data,
  emptyMessage,
}: DataTableProps<TData, TValue>) => {
  // Row selection state
  const [rowSelection, setRowSelection] = useState({})

  // Init table
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    manualPagination: true,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-auto">
      <table className="w-full text-[15px]">
        <thead className="border-b bg-secondary tracking-wide dark:bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className="h-14 px-6 text-left font-medium whitespace-nowrap"
                  key={header.id}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted/50"
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="max-w-57.5 truncate px-6 py-2.5 text-sm"
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-28 pt-6 text-center text-lg text-muted-foreground"
              >
                {emptyMessage || 'No data available'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
