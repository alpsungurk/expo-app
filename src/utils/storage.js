/**
 * Supabase Storage Helper Fonksiyonları
 * Resim yükleme ve yönetimi için yardımcı fonksiyonlar
 */

import { supabase } from '../config/supabase';
import Constants from 'expo-constants';

// Storage bucket adı
const BUCKET_NAME = 'images';

// Supabase URL'ini al
const getSupabaseUrl = () => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 
         Constants.expoConfig?.extra?.supabaseUrl;
};

/**
 * Resim yükleme fonksiyonu
 * @param {File} file - Yüklenecek dosya
 * @param {string} path - Dosya yolu (örn: 'urunler/adana-kebap.jpg')
 * @returns {Promise<{data: any, error: any}>}
 */
export const uploadImage = async (file, path) => {
  try {
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true // Aynı isimde dosya varsa üzerine yaz
      });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Path temizleme fonksiyonu
 * @param {string} path - Ham dosya yolu
 * @returns {string} - Temizlenmiş dosya yolu
 */
const cleanPath = (path) => {
  if (!path || typeof path !== 'string') return path;
  
  // Başındaki ve sonundaki boşlukları kaldır
  let cleanPath = path.trim();
  
  // /images/ ile başlıyorsa kaldır
  cleanPath = cleanPath.replace(/^\/images\//, '');
  // / ile başlıyorsa kaldır
  cleanPath = cleanPath.replace(/^\//, '');
  // images/ ile başlıyorsa kaldır (bucket adını kaldır)
  cleanPath = cleanPath.replace(/^images\//, '');
  
  return cleanPath;
};

/**
 * URL oluşturma helper fonksiyonu
 * @param {string} supabaseUrl - Supabase base URL
 * @param {string} filePath - Dosya path'i
 * @returns {string} - Tam URL
 */
const buildStorageUrl = (supabaseUrl, filePath) => {
  let baseUrl = supabaseUrl.trim();
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  
  // Path'teki özel karakterleri encode et (ama / karakterlerini koru)
  const tempPath = filePath.replace(/\//g, '___SLASH___');
  const encodedPath = encodeURIComponent(tempPath).replace(/___SLASH___/g, '/');
  
  return `${baseUrl}storage/v1/object/public/${BUCKET_NAME}/${encodedPath}`;
};

/**
 * Dosya varlığını kontrol eden fonksiyon (async)
 * @param {string} filePath - Kontrol edilecek dosya path'i
 * @returns {Promise<boolean>} - Dosya varsa true
 */
const checkFileExists = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(filePath.includes('/') ? filePath.split('/')[0] : '', {
        limit: 1000,
        search: filePath.includes('/') ? filePath.split('/').pop() : filePath
      });
    
    if (error) {
      return false;
    }
    
    // Dosya adını bul
    const fileName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
    const exists = data?.some(file => file.name === fileName) || false;
    return exists;
  } catch (error) {
    return false;
  }
};

/**
 * Resim URL'si alma fonksiyonu
 * @param {string} path - Dosya yolu (örn: 'kahvalti.jpg', '/images/kahvalti.jpg', 'images/kahvalti.jpg')
 * @returns {string|null} - Public URL
 */
export const getImageUrl = (path) => {
  if (!path) {
    return null;
  }
  
  // Eğer zaten tam URL ise direkt kullan
  if (typeof path === 'string' && /^https?:\/\//i.test(path)) {
    return path;
  }
  
  // Path'i temizle
  const cleanedPath = cleanPath(path);
  
  if (!cleanedPath) {
    return null;
  }
  
  try {
    // Supabase URL'ini al
    const supabaseUrl = getSupabaseUrl();
    
    if (!supabaseUrl) {
      return null;
    }
    
    // Olası path'leri dene (root, masalar/, vb.)
    const possiblePaths = [
      cleanedPath, // Direkt root'ta
      `masalar/${cleanedPath}`, // masalar klasöründe
      `urunler/${cleanedPath}`, // urunler klasöründe
    ];
    
    // İlk path'i döndür (dosya kontrolü async olduğu için şimdilik ilk path'i döndürüyoruz)
    // Gerçek kontrol Image component'inin onError callback'inde yapılabilir
    const directUrl = buildStorageUrl(supabaseUrl, cleanedPath);
    
    // Not: Dosya varlık kontrolü async olduğu için burada yapmıyoruz
    // Image component'i 404 hatası alırsa onError callback'i çalışacak
    // Alternatif path'leri denemek için getImageUrlWithFallback kullanılabilir
    
    return directUrl;
  } catch (error) {
    // Hata durumunda manuel URL dene
    const supabaseUrl = getSupabaseUrl();
    if (supabaseUrl) {
      return buildStorageUrl(supabaseUrl, cleanedPath);
    }
    return null;
  }
};

/**
 * Alternatif path'lerle resim URL'si alma fonksiyonu (async)
 * @param {string} path - Dosya yolu
 * @returns {Promise<string|null>} - Public URL
 */
export const getImageUrlWithFallback = async (path) => {
  if (!path) return null;
  
  if (typeof path === 'string' && /^https?:\/\//i.test(path)) {
    return path;
  }
  
  const cleanedPath = cleanPath(path);
  if (!cleanedPath) return null;
  
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;
  
  // Olası path'leri dene
  const possiblePaths = [
    cleanedPath,
    `masalar/${cleanedPath}`,
    `urunler/${cleanedPath}`,
  ];
  
  // Her path'i kontrol et
  for (const testPath of possiblePaths) {
    const exists = await checkFileExists(testPath);
    if (exists) {
      const url = buildStorageUrl(supabaseUrl, testPath);
      return url;
    }
  }
  
  // Hiçbiri bulunamazsa ilk path'i döndür
  return buildStorageUrl(supabaseUrl, cleanedPath);
};

/**
 * Resim silme fonksiyonu
 * @param {string} path - Silinecek dosya yolu
 * @returns {Promise<{data: any, error: any}>}
 */
export const deleteImage = async (path) => {
  try {
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Bucket'taki tüm dosyaları listeleme
 * @param {string} folder - Klasör yolu (opsiyonel)
 * @returns {Promise<{data: any, error: any}>}
 */
export const listImages = async (folder = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Resim boyutunu kontrol etme
 * @param {File} file - Kontrol edilecek dosya
 * @param {number} maxSizeMB - Maksimum boyut (MB)
 * @returns {boolean}
 */
export const validateImageSize = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Resim tipini kontrol etme
 * @param {File} file - Kontrol edilecek dosya
 * @returns {boolean}
 */
export const validateImageType = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
};

/**
 * Resim yükleme için tam validasyon
 * @param {File} file - Kontrol edilecek dosya
 * @param {number} maxSizeMB - Maksimum boyut (MB)
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateImage = (file, maxSizeMB = 5) => {
  if (!file) {
    return { valid: false, error: 'Dosya seçilmedi' };
  }

  if (!validateImageType(file)) {
    return { valid: false, error: 'Sadece JPEG, PNG, WebP ve GIF dosyaları desteklenir' };
  }

  if (!validateImageSize(file, maxSizeMB)) {
    return { valid: false, error: `Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır` };
  }

  return { valid: true, error: null };
};

/**
 * Örnek resim yükleme fonksiyonu
 * @param {File} file - Yüklenecek dosya
 * @param {string} urunAdi - Ürün adı (dosya adı için)
 * @returns {Promise<{success: boolean, url: string|null, error: string|null}>}
 */
export const uploadProductImage = async (file, urunAdi) => {
  // Validasyon
  const validation = validateImage(file);
  if (!validation.valid) {
    return { success: false, url: null, error: validation.error };
  }

  // Dosya adını oluştur
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${urunAdi.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${fileExtension}`;
  const filePath = `urunler/${fileName}`;

  // Resmi yükle
  const { data, error } = await uploadImage(file, filePath);
  
  if (error) {
    return { success: false, url: null, error: error.message };
  }

  // Public URL'i al
  const publicUrl = getImageUrl(filePath);
  
  return { success: true, url: publicUrl, error: null };
};
