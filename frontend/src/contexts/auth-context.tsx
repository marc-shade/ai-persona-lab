'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  tenant: {
    id: string
    name: string
    plan: string
  }
  onboardingCompleted: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  name: string
  tenantName: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user_data'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  // Robust API base: prefer env, else current origin, else localhost:3006 (dev)
  const DEFAULT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3030'
  // Use same-origin proxy alias to avoid CORS and NextAuth path conflicts
  const API_BASE = `${(DEFAULT_ORIGIN).replace(/\/$/, '')}/api/bapi`

  // Initialize auth state from localStorage and check for OAuth callback
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for OAuth callback tokens in URL hash
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1)
          const params = new URLSearchParams(hash)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            console.log('OAuth tokens found in URL, processing...')
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname)

            // Store and verify tokens
            localStorage.setItem(AUTH_TOKEN_KEY, accessToken)
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
            await verifyToken(accessToken)

            // Redirect to dashboard
            router.push('/dashboard')
            return
          }
        }

        // Check for OAuth error in query params
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const error = urlParams.get('error')
          if (error) {
            console.error('OAuth error:', urlParams.get('message') || error)
            // Clear the query params
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        // Normal auth initialization from localStorage
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const userData = localStorage.getItem(USER_KEY)

        if (token && userData) {
          setUser(JSON.parse(userData))
          // Verify token is still valid
          await verifyToken(token)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Clear invalid auth data
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Token verification failed')
      }

      const userData = await response.json()
      setUser(userData)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
    } catch (error) {
      console.error('Token verification failed:', error)
      clearAuthData()
      throw error
    }
  }

  const parseJsonSafe = async (res: Response) => {
    try {
      return await res.json()
    } catch {
      const text = await res.text().catch(() => '')
      return { error: text || 'Request failed' }
    }
  }

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const error = await parseJsonSafe(response)
        throw new Error((error as any).message || (error as any).error || 'Login failed')
      }

      const data = await parseJsonSafe(response)

      // Store tokens and user data
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      }
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      setUser(data.user)

      toast.success('Welcome back!')

      // Redirect based on onboarding status
      if (!data.user.onboardingCompleted) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await parseJsonSafe(response)
        throw new Error((error as any).message || (error as any).error || 'Registration failed')
      }

      const result = await parseJsonSafe(response)

      // Store tokens and user data
      localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken)
      if (result.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
      }
      localStorage.setItem(USER_KEY, JSON.stringify(result.user))

      setUser(result.user)

      toast.success('Account created successfully!')

      // Always go to onboarding for new users
      router.push('/onboarding')
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
      throw error
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      })

      if (!response.ok) {
        const error = await parseJsonSafe(response)
        throw new Error((error as any).message || (error as any).error || 'Token refresh failed')
      }

      const data = await parseJsonSafe(response)

      // Update stored tokens
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearAuthData()
      router.push('/auth/login')
      throw error
    }
  }

  const logout = () => {
    clearAuthData()
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  const clearAuthData = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
  }

  // Set tokens from OAuth callback
  const setTokens = async (accessToken: string, refreshTokenValue: string) => {
    try {
      // Store tokens
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue)

      // Verify token and get user data
      await verifyToken(accessToken)
    } catch (error) {
      console.error('Failed to set tokens:', error)
      clearAuthData()
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    setTokens
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hook for getting auth token
export function useAuthToken() {
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_KEY)
    }
    return null
  }

  return { getToken }
}
