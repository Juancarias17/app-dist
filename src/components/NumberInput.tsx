import { useState, useEffect, type InputHTMLAttributes } from 'react'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
}

export function NumberInput({ value, onChange, onFocus, ...rest }: NumberInputProps) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    if (value !== 0) setRaw(String(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setRaw(v)
    onChange(v === '' || v === '-' ? 0 : Number(v))
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
    onFocus?.(e)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={handleChange}
      onFocus={handleFocus}
      {...rest}
    />
  )
}
