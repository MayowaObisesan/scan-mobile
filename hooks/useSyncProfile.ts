// hooks/useSyncProfile.ts
import { useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useQueryClient } from '@tanstack/react-query'
import { fetchProfile } from './useProfile'

export function useSyncProfile(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Set up background sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Quietly update cache in background
        queryClient.prefetchQuery({
          queryKey: ['profile', userId],
          queryFn: () => fetchProfile(userId)
        })
      }
    })

    return () => unsubscribe()
  }, [userId])
}
