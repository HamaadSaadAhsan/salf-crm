'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { logoutApi, LogoutApiError } from '@/lib/auth-logout'
import { useAuth } from './auth'

export function useLogout() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { logout } = useAuth({})
    const performLogout = useCallback(async (type: 'current' | 'all' | 'device', tokenId?: number) => {
        setLoading(true)
        setError(null)

        try {
            let result

            switch (type) {
                case 'current':
                    result = await logout()
                    break
                case 'all':
                    result = await logoutApi.logoutAll()
                    break
                case 'device':
                    if (!tokenId) throw new Error('Token ID required for device logout')
                    result = await logoutApi.logoutDevice(tokenId)
                    break
            }

            // Sign out from NextAuth
            await logout()

            // Redirect to sign in page
            router.push('/auth/login')

            return { success: true, data: result }
        } catch (error) {
            const errorMessage = error instanceof LogoutApiError
                ? error.message
                : 'Failed to logout'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }, [router])

    const logoutAll = useCallback(() => performLogout('all'), [performLogout])
    const logoutDevice = useCallback((tokenId: number) => performLogout('device', tokenId), [performLogout])

    return {
        loading,
        error,
        logout,
        logoutAll,
        logoutDevice,
        clearError: () => setError(null)
    }
}
