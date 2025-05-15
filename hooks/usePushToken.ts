import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { useEffect, useState } from 'react'
import { supabase } from '~/supabase/client'

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (expoPushToken) => {
      setToken(expoPushToken)
      if (expoPushToken) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: expoPushToken })
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
      }
    })
  }, [])

  return token
}

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  const { status } = existingStatus !== 'granted'
    ? await Notifications.requestPermissionsAsync()
    : { status: existingStatus }

  if (status !== 'granted') return null

  const tokenData = await Notifications.getExpoPushTokenAsync()
  return tokenData.data
}
