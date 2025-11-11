import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables'dan Supabase bağlantı bilgilerini al
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl ||
                   'https://hgxicutwejvfysjsmjcw.supabase.co';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 
                       process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                       Constants.expoConfig?.extra?.supabaseAnonKey ||
                       Constants.expoConfig?.extra?.supabaseKey;

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
  }
);

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
