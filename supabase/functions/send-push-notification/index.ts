// @ts-nocheck
// Supabase Edge Function - Expo Push Notification Gönderme
// Kullanım: Supabase Dashboard > Edge Functions > Deploy
// Not: Bu dosya Deno runtime'ında çalışır, TypeScript hataları IDE için görmezden gelinir

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variable'dan Expo Push API URL'ini al
// Varsayılan değer: Expo'nun resmi API URL'i
const EXPO_PUSH_API_URL = Deno.env.get('EXPO_PUSH_API_URL') || 
                          Deno.env.get('EXPO_PUBLIC_EXPO_PUSH_API_URL') ||
                          'https://exp.host/--/api/v2/push/send'

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

    let requestBody;
    try {
      requestBody = await req.json()
    } catch (jsonError) {
      console.error('JSON parse hatası:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Geçersiz JSON formatı', details: jsonError.message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    const { title, body, data, pushTokens, userId } = requestBody

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

    console.log('Expo Push API\'ye gönderiliyor:', {
      url: EXPO_PUSH_API_URL,
      messageCount: messages.length,
      tokens: validTokens.map(t => t.substring(0, 30) + '...')
    });

    let response;
    let result;
    try {
      response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      })

      result = await response.json()
    } catch (fetchError) {
      console.error('Fetch hatası:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Expo Push API\'ye bağlanılamadı', 
          details: fetchError.message,
          url: EXPO_PUSH_API_URL
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

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
    console.error('Edge Function hatası:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Bilinmeyen hata',
        stack: error.stack,
        details: 'Edge Function içinde bir hata oluştu'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
})

