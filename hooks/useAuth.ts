import {supabase} from '~/supabase/client'
import {useState} from 'react'
import {User} from "@supabase/auth-js";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useIsomorphicLayoutEffect(() => {
    const session = supabase.auth.getSession().then(({data}) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  return {user, loading}
}
