import React from "react"

interface PreviewTableProps {
  title: string
  rows: any[]
}

const PreviewTable: React.FC<PreviewTableProps> = ({ title, rows }) => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return <div className="mb-4"><strong>{title}:</strong> <span className="text-muted-foreground">No data</span></div>
  }
  const columns = Object.keys(rows[0])
  const isMeals = title.toLowerCase() === 'meals'
  const isCalendarFormat = isMeals && columns.length > 10 // Calendar format has many day columns
  
  return (
    <div className="mb-4">
      <strong>{title}:</strong>
      <div className="overflow-x-auto rounded-lg border shadow-sm mt-2">
        <table className="min-w-full text-sm">
          <caption className="sr-only">{title} preview</caption>
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col}
                  scope="col"
                  className={`border px-3 py-2 font-semibold text-foreground${
                    idx === 0 ? ' min-w-[180px] text-left' : 
                    isCalendarFormat ? ' min-w-[60px] text-center' :
                    isMeals ? ' text-center' : ' text-left'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={
                  `transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/50'} hover:bg-accent`
                }
              >
                {columns.map((col, idx) => (
                  <td
                    key={col}
                    className={`border px-3 py-2 align-top${
                      idx === 0 ? ' min-w-[180px] text-left' : 
                      isCalendarFormat ? ' min-w-[60px] text-center' :
                      isMeals ? ' text-center' : ' text-left'
                    }`}
                  >
                    <span
                      className={`block truncate cursor-pointer${
                        isCalendarFormat ? ' max-w-[60px]' : ' max-w-[200px]'
                      }`}
                      title={
                        Array.isArray(row[col]) && row[col].length === 2 && typeof row[col][1] === 'string'
                          ? `${row[col][0]} ${row[col][1]}`
                          : row[col] != null ? String(row[col]) : ''
                      }
                    >
                      {Array.isArray(row[col]) && row[col].length === 2 && typeof row[col][1] === 'string' ? (
                        <span className="inline-flex items-center justify-center text-sm font-medium text-foreground">
                          {row[col][0]} <span className="ml-1 text-xs text-muted-foreground">({row[col][1]})</span>
                        </span>
                      ) : (
                        row[col] != null ? String(row[col]) : ''
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PreviewTable; 