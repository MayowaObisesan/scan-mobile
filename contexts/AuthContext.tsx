// contexts/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react'
import { User } from '@supabase/auth-js'
import { supabase } from '~/supabase/client'
import { useIsomorphicLayoutEffect } from '@rn-primitives/hooks'
import { router } from 'expo-router'
import { clearWallets } from '~/solana/wallet'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshSession: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshSession = async () => {
    try {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to refresh session'))
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      await clearWallets()
      setUser(null)
      router.replace('/(auth)/login')
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to sign out'))
    }
  }

  useIsomorphicLayoutEffect(() => {
    refreshSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
