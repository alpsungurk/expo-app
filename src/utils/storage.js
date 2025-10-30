/**
 * Supabase Storage Helper Fonksiyonları
 * Resim yükleme ve yönetimi için yardımcı fonksiyonlar
 */

import { supabase } from '../config/supabase';

// Storage bucket adı
const BUCKET_NAME = 'images';

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
      console.error('❌ Resim yükleme hatası:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
    return { data: null, error };
  }
};

/**
 * Resim URL'si alma fonksiyonu
 * @param {string} path - Dosya yolu
 * @returns {string} - Public URL
 */
export const getImageUrl = (path) => {
  if (!path) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
    
  return data.publicUrl;
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
      console.error('❌ Resim silme hatası:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
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
      console.error('❌ Dosya listeleme hatası:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
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
