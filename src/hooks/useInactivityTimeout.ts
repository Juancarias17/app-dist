import { useEffect, useRef } from 'react'
import { useAuth, INACTIVITY_TIMEOUT } from '../context/AuthContext'

export function useInactivityTimeout() {
  const { logout, refreshActivity } = useAuth()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const reset = () => {
    refreshActivity()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const last = localStorage.getItem('lastActivity')
    const elapsed = last ? Date.now() - Number(last) : INACTIVITY_TIMEOUT + 1
    const remaining = Math.max(0, INACTIVITY_TIMEOUT - elapsed)

    timerRef.current = setTimeout(() => {
      logout()
    }, remaining)

    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [logout, refreshActivity])
}
