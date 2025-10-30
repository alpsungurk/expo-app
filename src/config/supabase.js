import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables'dan Supabase bağlantı bilgilerini al
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl;

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                       Constants.expoConfig?.extra?.supabaseAnonKey;

// Supabase client oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'ngrok-skip-browser-warning': 'true'
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
  YENI_ONERILER:'yeni_oneriler',
  SISTEM_AYARLARI: 'sistem_ayarlari'
};
