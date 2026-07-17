import { ChevronUp, ChevronDown } from 'lucide-react'

interface SortableThProps {
  label: string
  sortKey: string
  activeSortKey: string | null
  sortDir: 'asc' | 'desc'
  onToggle: (key: string) => void
}

export function SortableTh({ label, sortKey, activeSortKey, sortDir, onToggle }: SortableThProps) {
  const active = activeSortKey === sortKey

  return (
    <th className={`th-sortable${active ? ' th-sortable-active' : ''}`} onClick={() => onToggle(sortKey)}>
      <span className="th-sortable-content">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <ChevronUp size={14} className="th-sortable-idle" />
        )}
      </span>
    </th>
  )
}
