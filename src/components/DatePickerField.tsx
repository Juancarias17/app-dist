import { useState, useEffect } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { es } from 'date-fns/locale/es'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('es', es)

interface DatePickerFieldProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  className?: string
}

function toLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mobile
}

export function DatePickerField({ value, onChange, placeholder = 'Seleccionar fecha', minDate, maxDate, className }: DatePickerFieldProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <input
        type="date"
        value={value}
        min={minDate ? toDateString(minDate) : undefined}
        max={maxDate ? toDateString(maxDate) : undefined}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`date-picker-input${className ? ` ${className}` : ''}`}
      />
    )
  }

  return (
    <DatePicker
      selected={toLocalDate(value)}
      onChange={(date: Date | null) => date && onChange(toDateString(date))}
      locale="es"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      minDate={minDate}
      maxDate={maxDate}
      className={`date-picker-input${className ? ` ${className}` : ''}`}
      calendarClassName="date-picker-calendar"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
    />
  )
}
