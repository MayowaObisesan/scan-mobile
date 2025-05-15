import { supabase } from '~/supabase/client'

export type UserProfile = {
  id: string
  username: string
  phone: string
  avatar_url?: string
  bio?: string
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Profile error:', error.message)
    return null
  }

  return data
}

export async function updateMyProfile(updates: Partial<UserProfile>) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  return { error }
}
