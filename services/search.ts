import { supabase } from '~/supabase/client'

export type UserProfile = {
  id: string
  username: string
  phone: string
  avatar_url?: string
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, phone, avatar_url')
    .or(`username.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(20)

  if (error) {
    console.error('Search error:', error.message)
    return []
  }

  return data ?? []
}
