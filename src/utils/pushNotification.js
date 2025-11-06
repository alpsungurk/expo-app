// Expo Push Notification Gönderme Utility Fonksiyonu
// Bu fonksiyon Supabase Edge Function'ı çağırarak push notification gönderir

import { supabase } from '../config/supabase';
import Constants from 'expo-constants';

// Environment variable'dan Expo Push API URL'ini al
const EXPO_PUSH_API_URL = process.env.EXPO_PUBLIC_EXPO_PUSH_API_URL || 
                          Constants.expoConfig?.extra?.expoPushApiUrl;

/**
 * Tek bir kullanıcıya push notification gönder
 * @param {string} userId - Kullanıcı ID (UUID)
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToUser(userId, title, body, data = {}) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Push notification gönderme hatası:', error);
      return { success: false, error };
    }

    return { success: true, result };
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Birden fazla push token'a bildirim gönder
 * @param {string[]} pushTokens - Push token array
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToTokens(pushTokens, title, body, data = {}) {
  try {
    console.log('Push notification gönderiliyor:', {
      tokenCount: pushTokens?.length || 0,
      title,
      body
    });

    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        pushTokens,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Push notification gönderme hatası:', error);
      // Edge Function'dan gelen detaylı hata mesajını göster
      if (error.context?.body) {
        console.error('Edge Function hata detayı:', error.context.body);
      }
      return { success: false, error: error.message || error, details: error.context };
    }

    return { success: true, result };
  } catch (error) {
    console.error('Push notification gönderme hatası:', error);
    return { success: false, error: error.message || error };
  }
}

/**
 * Tüm aktif kullanıcılara bildirim gönder
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<object>} Sonuç
 */
export async function sendPushNotificationToAllUsers(title, body, data = {}) {
  try {
    // Tüm aktif kullanıcıların push token'larını al
    const { data: profiles, error } = await supabase
      .from('kullanici_profilleri')
      .select('push_token')
      .not('push_token', 'is', null);

    if (error) {
      console.error('Push token alma hatası:', error);
      return { success: false, error };
    }

    const pushTokens = profiles
      .map(p => p.push_token)
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
 * Sipariş durumu değiştiğinde bildirim gönder
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
 * TEST İÇİN: Direkt Expo Push API'ye bildirim gönder (Edge Function olmadan)
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

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        // Eğer push security enabled ise, access token ekleyin
        ...(options.accessToken && { 'Authorization': `Bearer ${options.accessToken}` }),
      },
      body: JSON.stringify(message),
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

