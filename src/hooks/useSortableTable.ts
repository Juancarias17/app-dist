import { useMemo, useState } from 'react'

type SortDir = 'asc' | 'desc'

function getNestedValue(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in acc) {
      return (acc as Record<string, unknown>)[k]
    }
    return undefined
  }, obj)
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), 'es')
}

export function useSortableTable<T>(data: T[]) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const result = compareValues(getNestedValue(a, sortKey), getNestedValue(b, sortKey))
      return sortDir === 'asc' ? result : -result
    })
  }, [data, sortKey, sortDir])

  return { sortKey, sortDir, toggleSort, sortedData }
}
