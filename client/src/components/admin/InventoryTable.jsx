import { inventoryRows } from '../../data/mockData'

export function InventoryTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="bg-[var(--bg-primary)] text-white">
          <tr>
            {['Part', 'Code', 'Vehicle', 'Stock', 'Status'].map((heading) => (
              <th className="px-4 py-3 text-xs font-black uppercase" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inventoryRows.map((row) => (
            <tr className="border-b border-[var(--border)] last:border-0" key={row.code}>
              <td className="px-4 py-4 font-semibold text-[var(--text-primary)]">{row.part}</td>
              <td className="px-4 py-4 text-[var(--text-secondary)]">{row.code}</td>
              <td className="px-4 py-4 text-[var(--text-secondary)]">{row.vehicle}</td>
              <td className="px-4 py-4 font-black text-[var(--text-primary)]">{row.stock}</td>
              <td className="px-4 py-4">
                <span className="rounded-full bg-[var(--primary)]/15 px-3 py-1 text-xs font-black text-[var(--primary)]">
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
