import { router } from '@inertiajs/react'
import { useEffect, useCallback } from 'react'
import { usePage } from '@inertiajs/react'

export const useAuth = ({
  middleware,
  redirectIfAuthenticated,
}: {
  middleware?: string
  redirectIfAuthenticated?: string
}) => {
  const { props } = usePage<{ auth?: { user?: any } }>()
  const user = props.auth?.user || null

  const register = useCallback((data: {
    name: string
    email: string
    password: string
    password_confirmation: string
  }) => {
    router.post('/register', data)
  }, [])

  const login = useCallback((data: {
    email: string
    password: string
    remember: boolean
  }) => {
    router.post('/login', data)
  }, [])

  const forgotPassword = useCallback((data: {
    email: string
  }) => {
    router.post('/forgot-password', data)
  }, [])

  const resetPassword = useCallback((data: {
    email: string
    password: string
    password_confirmation: string
    token: string
  }) => {
    router.post('/reset-password', data, {
      onSuccess: () => {
        router.visit('/login')
      }
    })
  }, [])

  const resendEmailVerification = useCallback(() => {
    router.post('/email/verification-notification')
  }, [])

  const logout = useCallback(() => {
    router.post('/logout', {}, {
      onFinish: () => {
        router.visit('/login')
      }
    })
  }, [])

  // Return the value of sidebar_state from cookies (client-side)
  const nextCookies = useCallback(() => {
    if (typeof window === "undefined") return true; // default to open on server
    const sidebarState = window.document.cookie
      .split("; ")
      .find((row) => row.startsWith("sidebar_state="));
    return sidebarState ? sidebarState.split("=")[1] === "true" : true;
  }, []);

  useEffect(() => {
    if (middleware === 'guest' && redirectIfAuthenticated && user) {
      router.visit(redirectIfAuthenticated)
    }

    if (
      window.location.pathname === '/verify-email' &&
      user?.email_verified_at &&
      redirectIfAuthenticated
    ) {
      router.visit(redirectIfAuthenticated)
    }
    if (middleware === 'auth' && !user) {
      logout()
    }
  }, [user, middleware, redirectIfAuthenticated, logout])

  return {
    user,
    nextCookies,
    register,
    login,
    forgotPassword,
    resetPassword,
    resendEmailVerification,
    logout,
  }
}
