import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables'ları al (önce .env, sonra app.config.js)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl || 
                   'https://your-project.supabase.co';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                       Constants.expoConfig?.extra?.supabaseAnonKey || 
                       'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
