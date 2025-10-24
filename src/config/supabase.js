import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Local Supabase bağlantısı
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl || 
                   'http://127.0.0.1:54321';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                       Constants.expoConfig?.extra?.supabaseAnonKey || 
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Debug: Bağlantı bilgilerini konsola yazdır
console.log('🔍 Supabase Debug Bilgileri:');
console.log('📡 Supabase URL:', supabaseUrl);
console.log('🔑 Anon Key (ilk 50 karakter):', supabaseAnonKey.substring(0, 50) + '...');
console.log('🌍 Environment URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('⚙️ Config URL:', Constants.expoConfig?.extra?.supabaseUrl);

// Supabase client oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
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
