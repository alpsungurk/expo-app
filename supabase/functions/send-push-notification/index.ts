// Supabase Edge Function - Expo Push Notification Gönderme
// Kullanım: Supabase Dashboard > Edge Functions > Deploy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { title, body, data, pushTokens, userId } = await req.json()

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title ve body gereklidir' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Supabase client oluştur
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let tokensToSend: string[] = []

    // Eğer userId verilmişse, o kullanıcının token'ını al
    if (userId) {
      const { data: profile, error } = await supabase
        .from('kullanici_profilleri')
        .select('push_token')
        .eq('id', userId)
        .single()

      if (error || !profile?.push_token) {
        return new Response(
          JSON.stringify({ error: 'Kullanıcı push token bulunamadı' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          }
        )
      }

      tokensToSend = [profile.push_token]
    } 
    // Eğer pushTokens array verilmişse, onları kullan
    else if (pushTokens && Array.isArray(pushTokens)) {
      tokensToSend = pushTokens
    } 
    // Hiçbiri verilmemişse hata
    else {
      return new Response(
        JSON.stringify({ error: 'userId veya pushTokens gereklidir' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Geçerli token'ları filtrele
    const validTokens = tokensToSend.filter(token => token && token.startsWith('ExponentPushToken'))

    if (validTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Geçerli push token bulunamadı' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Expo Push Notification API'ye gönder
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }))

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })

    const result = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Push notification gönderilemedi', details: result }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: result.data?.length || 0,
        results: result.data 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
})

