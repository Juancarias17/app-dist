import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { authService } from '../services/auth.service'
import type { LoginRequest } from '../types'

const INACTIVITY_TIMEOUT = 1_800_000

interface AuthContextType {
  token: string | null
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  refreshActivity: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('lastActivity')
    return null
  })

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('lastActivity')
    window.location.href = '/login'
  }, [])

  const refreshActivity = useCallback(() => {
    localStorage.setItem('lastActivity', Date.now().toString())
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authService.login(data)
    localStorage.setItem('token', res.token)
    refreshActivity()
    setToken(res.token)
  }, [refreshActivity])

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        isAuthenticated: !!token,
        refreshActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { INACTIVITY_TIMEOUT }
