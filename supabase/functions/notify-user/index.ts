// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// Supabase Edge Function
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { Expo } from 'npm:expo-server-sdk'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { to_user_id, title, body } = await req.json()

  const { data: user } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', to_user_id)
    .single()

  if (!user?.expo_push_token) {
    return new Response(JSON.stringify({ error: 'No push token' }), { status: 400 })
  }

  const expo = new Expo()
  const chunks = expo.chunkPushNotifications([
    {
      to: user.expo_push_token,
      sound: 'default',
      title,
      body
    }
  ])

  const receipts = await Promise.all(chunks.map(chunk => expo.sendPushNotificationsAsync(chunk)))
  return new Response(JSON.stringify({ receipts }), { status: 200 })
})
