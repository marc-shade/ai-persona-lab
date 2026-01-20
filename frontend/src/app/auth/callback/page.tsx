'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setTokens } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error in query params
      const errorParam = searchParams.get('error')
      const errorMessage = searchParams.get('message')

      if (errorParam) {
        setError(errorMessage || 'Authentication failed')
        toast.error(errorMessage || 'Authentication failed')
        setTimeout(() => router.push('/auth/login'), 3000)
        return
      }

      // Parse tokens from URL hash (fragment)
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        try {
          // Store tokens using auth context
          await setTokens(accessToken, refreshToken)

          toast.success('Successfully signed in!')

          // Redirect to dashboard
          router.push('/dashboard')
        } catch (err) {
          console.error('Failed to process OAuth tokens:', err)
          setError('Failed to complete authentication')
          toast.error('Failed to complete authentication')
          setTimeout(() => router.push('/auth/login'), 3000)
        }
      } else {
        setError('No authentication tokens received')
        toast.error('No authentication tokens received')
        setTimeout(() => router.push('/auth/login'), 3000)
      }
    }

    handleCallback()
  }, [router, searchParams, setTokens])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-destructive text-lg">{error}</div>
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  )
}
