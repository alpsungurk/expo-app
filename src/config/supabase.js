import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables'dan Supabase bağlantı bilgilerini al
// Production'da hardcoded değer kullanılmaz - sadece environment variable
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl;

export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 
                       process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                       Constants.expoConfig?.extra?.supabaseAnonKey ||
                       Constants.expoConfig?.extra?.supabaseKey;

// Güvenlik kontrolü - Production'da environment variable zorunlu
if (!__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Supabase yapılandırması eksik. Lütfen environment variable\'ları ayarlayın.');
}

// Supabase client oluştur
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'expo-app',
      },
    },
  }
);

// Global error handler - Refresh token hatalarını yakala
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Bozuk token'ları temizle
    try {
      await supabase.auth.signOut();
    } catch (error) {
    }
  }
  
  // Invalid refresh token hatası
  if (event === 'SIGNED_OUT' && !session) {
    // AsyncStorage'daki bozuk token'ları temizle
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => key.startsWith('sb-') || key.includes('supabase.auth'));
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
    } catch (error) {
    }
  }
});

// Veritabanı tabloları için type definitions
export const TABLES = {
  KATEGORILER: 'kategoriler',
  URUNLER: 'urunler',
  MASALAR: 'masalar',
  SIPARISLER: 'siparisler',
  SIPARIS_DETAYLARI: 'siparis_detaylari',
  KAMPANYALAR: 'kampanyalar',
  DUYURULAR: 'duyurular',
  URUN_OZELLESTIRME: 'urun_ozellestirme',
  OZELLESTIRME_DEGERLERI: 'ozellestirme_degerleri',
  YENI_ONERILER: 'yeni_oneriler',
  SISTEM_AYARLARI: 'sistem_ayarlari'
};
