// Expo Push Notification Gönderme Utility Fonksiyonu
// Bu fonksiyon Cloudflare Workers proxy API üzerinden Expo Push API'ye bildirim gönderir

import { supabase } from '../config/supabase';
import Constants from 'expo-constants';

// Environment variable'dan Push Notification API URL'ini al
// Cloudflare Workers proxy API kullanılıyor (CORS sorununu çözmek için)
const PUSH_NOTIFICATION_API_URL = process.env.VITE_PUSH_NOTIFICATION_API_URL ||
                                  process.env.EXPO_PUBLIC_PUSH_NOTIFICATION_API_URL ||
                                  Constants.expoConfig?.extra?.pushNotificationApiUrl ||
                                  'https://push-notification.kilicalpsungur.workers.dev';

/**
 * Tek bir kullanıcıya push notification gönder (Cloudflare Workers Proxy üzerinden)
 * @param {string} userId - Kullanıcı ID (UUID)
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToUser(userId, title, body, data = {}) {
  try {
    // Kullanıcının push token'ını Supabase'den al
    const { data: profile, error: profileError } = await supabase
      .from('kullanici_profilleri')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.push_token) {
      console.warn('Kullanıcı push token bulunamadı:', userId);
      return { 
        success: false, 
        error: 'Kullanıcı push token bulunamadı',
        skipLog: true
      };
    }

    // push_tokens tablosundan aktif token'ı kontrol et
    const { data: pushTokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('push_token')
      .eq('push_token', profile.push_token)
      .eq('is_active', true)
      .single();

    if (tokenError || !pushTokenData?.push_token) {
      console.warn('Aktif push token bulunamadı:', profile.push_token);
      return { 
        success: false, 
        error: 'Aktif push token bulunamadı',
        skipLog: true
      };
    }

    // sendPushNotificationToTokens kullanarak gönder
    return await sendPushNotificationToTokens(
      [pushTokenData.push_token],
      title,
      body,
      data
    );
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Birden fazla push token'a bildirim gönder (Cloudflare Workers Proxy üzerinden)
 * @param {string[]} pushTokens - Push token array
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToTokens(pushTokens, title, body, data = {}) {
  try {
    // Token kontrolü
    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return { 
        success: false, 
        error: 'Geçerli push token bulunamadı',
        skipLog: true // Bu hatayı loglamaya gerek yok
      };
    }

    // Geçerli token'ları filtrele
    const validTokens = pushTokens.filter(token => token && token.startsWith('ExponentPushToken'));
    if (validTokens.length === 0) {
      return { 
        success: false, 
        error: 'Geçerli Expo push token bulunamadı',
        skipLog: true
      };
    }

    console.log('Push notification gönderiliyor (Cloudflare Workers Proxy):', {
      tokenCount: validTokens.length,
      title,
      body,
      apiUrl: PUSH_NOTIFICATION_API_URL
    });

    // Her token için mesaj oluştur
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }));

    // Cloudflare Workers proxy API üzerinden Expo Push API'ye gönder
    const response = await fetch(PUSH_NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Push notification gönderme hatası:', result);
      return { 
        success: false, 
        error: result.error?.message || 'Bildirim gönderilemedi',
        details: result,
        skipLog: false
      };
    }

    console.log('Push notification başarıyla gönderildi:', {
      sent: result.data?.length || 0,
      results: result.data
    });

    return { 
      success: true, 
      result: result.data || result,
      sent: result.data?.length || 0
    };
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { 
      success: false, 
      error: error.message || error,
      skipLog: false
    };
  }
}

/**
 * Tüm aktif kullanıcılara bildirim gönder (Cloudflare Workers Proxy üzerinden)
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToAllUsers(title, body, data = {}) {
  try {
    // Tüm aktif push token'ları al (is_active: true olanlar)
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('push_token')
      .eq('is_active', true)
      .not('push_token', 'is', null);

    if (error) {
      console.error('Push token alma hatası:', error);
      return { success: false, error };
    }

    const pushTokens = tokens
      .map(t => t.push_token)
      .filter(token => token && token.startsWith('ExponentPushToken'));

    if (pushTokens.length === 0) {
      return { success: false, error: 'Aktif push token bulunamadı' };
    }

    return await sendPushNotificationToTokens(pushTokens, title, body, data);
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sipariş durumu değiştiğinde bildirim gönder (Cloudflare Workers Proxy üzerinden)
 * @param {string} userId - Kullanıcı ID
 * @param {string} siparisNo - Sipariş numarası
 * @param {string} durum - Yeni sipariş durumu
 */
export async function sendOrderStatusNotification(userId, siparisNo, durum) {
  const durumMesajlari = {
    'beklemede': 'Siparişiniz alındı ve hazırlanıyor.',
    'hazirlaniyor': 'Siparişiniz hazırlanıyor.',
    'hazir': 'Siparişiniz hazır!',
    'teslim_edildi': 'Siparişiniz teslim edildi.',
    'iptal': 'Siparişiniz iptal edildi.',
  };

  const mesaj = durumMesajlari[durum] || 'Sipariş durumunuz güncellendi.';

  return await sendPushNotificationToUser(
    userId,
    'Sipariş Durumu Güncellendi',
    `Sipariş #${siparisNo}: ${mesaj}`,
    {
      type: 'order_status',
      siparisNo,
      durum,
    }
  );
}

/**
 * TEST İÇİN: Cloudflare Workers Proxy üzerinden bildirim gönder
 * @param {string} pushToken - Expo push token (ExponentPushToken[...])
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @param {object} options - iOS ve Android seçenekleri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendTestPushNotification(pushToken, title, body, data = {}, options = {}) {
  try {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
      return { 
        success: false, 
        error: 'Geçerli bir Expo push token gereklidir (ExponentPushToken[...] formatında)' 
      };
    }

    const message = {
      to: pushToken,
      sound: options.sound || 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'default',
      // iOS seçenekleri
      ...(options.subtitle && { subtitle: options.subtitle }),
      ...(options.badge !== undefined && { badge: options.badge }),
      ...(options.soundName && { sound: options.soundName }),
      // Android seçenekleri
      ...(options.channelId && { channelId: options.channelId }),
      // TTL (Time To Live) - saniye cinsinden
      ...(options.ttl !== undefined && { ttl: options.ttl }),
    };

    console.log('Push notification gönderiliyor:', message);

    // Cloudflare Workers proxy API üzerinden gönder
    const response = await fetch(PUSH_NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify([message]), // Array olarak gönder (Cloudflare Workers bekliyor)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Push notification gönderme hatası:', result);
      return { 
        success: false, 
        error: result.error?.message || 'Bildirim gönderilemedi',
        details: result 
      };
    }

    console.log('Push notification başarıyla gönderildi:', result);
    return { 
      success: true, 
      result: result.data?.[0] || result,
      receiptId: result.data?.[0]?.id 
    };
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

