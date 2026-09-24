import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { normalize } from '../utils/normalize'
import './SearchableSelect.css'
import './SearchableInput.css'

interface SearchableInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}

export function SearchableInput({ value, onChange, options, placeholder }: SearchableInputProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 220 })
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const focusJustSetRef = useRef(false)

  const filtered = useMemo(() => {
    const q = normalize(value.trim())
    const matches = q ? options.filter((o) => normalize(o).includes(q)) : options
    return matches.slice(0, 50)
  }, [options, value])

  const computePosition = () => {
    const rect = inputRef.current!.getBoundingClientRect()
    const vh = window.visualViewport?.height ?? window.innerHeight
    const top = rect.bottom + 4
    const maxHeight = Math.min(220, Math.max(120, vh - top - 8))
    return { top, left: rect.left, width: rect.width, maxHeight }
  }

  const openDropdown = () => {
    setPos(computePosition())
    setHighlight(0)
    setOpen(true)
  }

  const closeDropdown = () => setOpen(false)

  const handleToggle = () => {
    if (focusJustSetRef.current) {
      focusJustSetRef.current = false
      return
    }
    if (open) {
      closeDropdown()
    } else {
      inputRef.current?.select()
      openDropdown()
    }
  }

  const reposition = () => {
    if (!inputRef.current) return
    setPos(computePosition())
  }

  const select = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' && filtered.length > 0 && value.length > 0) {
        e.preventDefault()
        openDropdown()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (filtered.length > 0 ? (h + 1) % filtered.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (filtered.length > 0 ? (h - 1 + filtered.length) % filtered.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) select(filtered[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inside = rootRef.current?.contains(target) || dropdownRef.current?.contains(target)
      if (!inside) setOpen(false)
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

  useEffect(() => {
    setHighlight(0)
  }, [filtered])

  const showDropdown = open && filtered.length > 0

  return (
    <div className="searchable-input" ref={rootRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          openDropdown()
        }}
        onFocus={() => {
          focusJustSetRef.current = true
          openDropdown()
        }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      />
      <ChevronDown size={14} className={`searchable-input-chevron${open ? ' open' : ''}`} />
      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            className="searchable-select-dropdown"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="searchable-select-list" style={{ maxHeight: pos.maxHeight }}>
              {filtered.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  className={`searchable-select-option${idx === highlight ? ' highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(name)
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}