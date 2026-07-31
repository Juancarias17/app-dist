import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import './SearchableSelect.css'

export interface SearchableOption {
  value: number
  label: string
  group?: string
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Seleccione', className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const [isTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    const matches = q
      ? options.filter((o) => normalize(o.label).includes(q))
      : options
    const groups: { group: string; items: SearchableOption[] }[] = []
    for (const o of matches) {
      const g = o.group ?? ''
      const existing = groups.find((gr) => gr.group === g)
      if (existing) existing.items.push(o)
      else groups.push({ group: g, items: [o] })
    }
    return groups
  }, [options, query])

  const grouped = filtered.length > 1 || filtered.some((g) => g.items.length > 1)
  const totalItems = filtered.reduce((acc, g) => acc + g.items.length, 0)

  const computePosition = () => {
    const rect = triggerRef.current!.getBoundingClientRect()
    const vh = window.visualViewport?.height ?? window.innerHeight
    const top = rect.bottom + 4
    const maxHeight = Math.min(280, Math.max(140, vh - top - 8))
    return {
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    }
  }

  const openDropdown = () => {
    setPos(computePosition())
    setQuery('')
    setOpen(true)
  }

  const reposition = () => {
    if (!triggerRef.current) return
    setPos(computePosition())
  }

  const select = (opt: SearchableOption) => {
    onChange(opt.value)
    setOpen(false)
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onFrame = () => {
      rafRef.current = undefined
      reposition()
    }
    const scheduleReposition = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(onFrame)
    }
    const onExternalScroll = (e: Event) => {
      if (rootRef.current && rootRef.current.contains(e.target as Node)) return
      scheduleReposition()
    }
    const onResize = () => scheduleReposition()
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onExternalScroll, true)
    window.addEventListener('resize', onResize)
    const vv = window.visualViewport
    if (vv) vv.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onExternalScroll, true)
      window.removeEventListener('resize', onResize)
      if (vv) vv.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const rootClass = `searchable-select${className ? ` ${className}` : ''}`

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`searchable-select-trigger${selected ? '' : ' is-empty'}`}
        onClick={() => (open ? setOpen(false) : openDropdown())}
      >
        <span className="searchable-select-value">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`searchable-select-chevron${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div
          className="searchable-select-dropdown"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="searchable-select-search">
            <Search size={14} />
            <input
              autoFocus={!isTouch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
            />
          </div>
          <div className="searchable-select-list" style={{ maxHeight: pos.maxHeight }}>
            {totalItems === 0 ? (
              <div className="searchable-select-empty">Sin resultados</div>
            ) : grouped ? (
              filtered.map((g) => (
                <Fragment key={g.group}>
                  <div className="searchable-select-group">{g.group || 'Otros'}</div>
                  {g.items.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={`searchable-select-option${o.value === value ? ' selected' : ''}`}
                      onClick={() => select(o)}
                    >
                      {o.label}
                    </button>
                  ))}
                </Fragment>
              ))
            ) : (
              filtered[0]?.items.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`searchable-select-option${o.value === value ? ' selected' : ''}`}
                  onClick={() => select(o)}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
