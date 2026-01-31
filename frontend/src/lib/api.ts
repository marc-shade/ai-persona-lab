import axios from 'axios'

// Derive a robust API base URL that works in dev/prod without manual edits
const DEFAULT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3006'
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  `${(process.env.NEXT_PUBLIC_API_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '')}/api`

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Cache-Control': 'no-store',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
          })

          if (response.ok) {
            const data = await response.json()
            localStorage.setItem('auth_token', data.accessToken)
            if (data.refreshToken) {
              localStorage.setItem('refresh_token', data.refreshToken)
            }

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }

      // If refresh fails, clear tokens and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_data')
      window.location.href = '/auth/login'
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: async (data: { email: string; password: string; name: string; tenantName: string }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post('/auth/reset-password', data)
    return response.data
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  }
}

// Users API
export const usersApi = {
  getProfile: async () => {
    const response = await api.get('/users/profile')
    return response.data
  },

  updateProfile: async (data: Partial<{ name: string; email: string }>) => {
    const response = await api.put('/users/profile', data)
    return response.data
  },

  inviteUser: async (data: { email: string; role: string }) => {
    const response = await api.post('/users/invite', data)
    return response.data
  },

  getTeamMembers: async () => {
    const response = await api.get('/users/team')
    return response.data
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await api.put(`/users/${userId}/role`, { role })
    return response.data
  },

  removeUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`)
    return response.data
  }
}

// Personas API
export const personasApi = {
  getAll: async () => {
    const response = await api.get('/personas')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/personas/${id}`)
    return response.data
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/personas', data)
    return response.data
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/personas/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/personas/${id}`)
    return response.data
  },

  generateInsights: async (id: string) => {
    const response = await api.post(`/personas/${id}/insights`)
    return response.data
  }
}

// Experiments API
export const experimentsApi = {
  getAll: async () => {
    const response = await api.get('/experiments')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/experiments/${id}`)
    return response.data
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/experiments', data)
    return response.data
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/experiments/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/experiments/${id}`)
    return response.data
  },

  run: async (id: string) => {
    const response = await api.post(`/experiments/${id}/run`)
    return response.data
  },

  stop: async (id: string) => {
    const response = await api.post(`/experiments/${id}/stop`)
    return response.data
  },

  getResults: async (id: string) => {
    const response = await api.get(`/experiments/${id}/results`)
    return response.data
  }
}

// Analytics API
export const analyticsApi = {
  getDashboardData: async () => {
    const response = await api.get('/analytics/dashboard')
    return response.data
  },

  getPersonaMetrics: async (personaId?: string) => {
    const url = personaId ? `/analytics/personas/${personaId}` : '/analytics/personas'
    const response = await api.get(url)
    return response.data
  },

  getExperimentMetrics: async (experimentId?: string) => {
    const url = experimentId ? `/analytics/experiments/${experimentId}` : '/analytics/experiments'
    const response = await api.get(url)
    return response.data
  },

  getUsageStats: async () => {
    const response = await api.get('/analytics/usage')
    return response.data
  }
}

// Billing API
export const billingApi = {
  getSubscription: async () => {
    const response = await api.get('/billing/subscription')
    return response.data
  },

  createCheckoutSession: async (priceId: string) => {
    const response = await api.post('/billing/create-checkout-session', { priceId })
    return response.data
  },

  createPortalSession: async () => {
    const response = await api.post('/billing/create-portal-session')
    return response.data
  },

  getInvoices: async () => {
    const response = await api.get('/billing/invoices')
    return response.data
  },

  updateSubscription: async (priceId: string) => {
    const response = await api.put('/billing/subscription', { priceId })
    return response.data
  },

  cancelSubscription: async () => {
    const response = await api.delete('/billing/subscription')
    return response.data
  }
}

// ICP API
export const icpsApi = {
  getAll: async () => {
    const response = await api.get('/icps')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/icps/${id}`)
    return response.data
  },
  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/icps', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/icps/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/icps/${id}`)
    return response.data
  }
}

// Competitors API
export const competitorsApi = {
  getAll: async () => {
    const response = await api.get('/competitors')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/competitors/${id}`)
    return response.data
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/competitors', data)
    return response.data
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/competitors/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/competitors/${id}`)
    return response.data
  },

  addCompetitor: async (analysisId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/competitors/${analysisId}/competitors`, data)
    return response.data
  },

  removeCompetitor: async (analysisId: string, competitorId: string) => {
    const response = await api.delete(`/competitors/${analysisId}/competitors/${competitorId}`)
    return response.data
  },

  scrapeUrl: async (url: string) => {
    const response = await api.post('/competitors/scrape-url', { url })
    return response.data
  },

  scrape: async (analysisId: string) => {
    const response = await api.post(`/competitors/${analysisId}/scrape`)
    return response.data
  },

  analyze: async (analysisId: string) => {
    const response = await api.post(`/competitors/${analysisId}/analyze`)
    return response.data
  },
}

// Admin API
export const adminApi = {
  getStats: async () => {
    const response = await api.get('/admin/stats')
    return response.data
  },

  getUsers: async () => {
    const response = await api.get('/admin/users')
    return response.data
  },

  getTenants: async () => {
    const response = await api.get('/admin/tenants')
    return response.data
  },

  updateUser: async (userId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/users/${userId}`, data)
    return response.data
  },

  deleteTenant: async (tenantId: string) => {
    const response = await api.delete(`/admin/tenants/${tenantId}`)
    return response.data
  },

  bypassBilling: async (tenantId: string, plan: string) => {
    const response = await api.post(`/admin/billing/bypass`, { tenantId, plan })
    return response.data
  }
}

export default api
