import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const REFRESH_INTERVAL = 20 * 60 * 1000

export function useTokenRefresh() {
  const { token, refreshToken } = useAuth()

  useEffect(() => {
    if (!token) return

    const id = setInterval(() => {
      refreshToken().catch(() => {})
    }, REFRESH_INTERVAL)

    return () => clearInterval(id)
  }, [token, refreshToken])
}
