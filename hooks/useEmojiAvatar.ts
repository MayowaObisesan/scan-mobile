// hooks/useEmojiAvatar.ts
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { toast } from 'sonner-native'

const EMOJI_STORAGE_KEY = '@user_emoji_avatar'

export function useEmojiAvatar() {
  const [localEmoji, setLocalEmoji] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEmoji()
  }, [])

  const loadEmoji = async () => {
    try {
      setIsLoading(true)
      const savedEmoji = await AsyncStorage.getItem(EMOJI_STORAGE_KEY)
      setLocalEmoji(savedEmoji)
    } catch (error) {
      console.error('Error loading emoji:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveEmoji = async (emoji: string) => {
    try {
      await AsyncStorage.setItem(EMOJI_STORAGE_KEY, emoji)
      setLocalEmoji(emoji)
      toast.success('Profile emoji updated successfully')
      return true
    } catch (error) {
      toast.error('Error saving emoji', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
      return false
    }
  }

  const removeEmoji = async () => {
    try {
      await AsyncStorage.removeItem(EMOJI_STORAGE_KEY)
      setLocalEmoji(null)
      toast.success('Profile emoji removed successfully')
      return true
    } catch (error) {
      toast.error('Error removing emoji', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
      return false
    }
  }

  return {
    emoji: localEmoji,
    isLoading,
    saveEmoji,
    removeEmoji,
    refreshEmoji: loadEmoji
  }
}
