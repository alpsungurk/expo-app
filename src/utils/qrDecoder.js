/**
 * QR Kod Decoder Utility Fonksiyonları
 * URL'den masa parametresini çıkarıp decode eder
 */

/**
 * Base64 URL-safe decode fonksiyonu (React Native uyumlu)
 * @param {string} str - Decode edilecek string
 * @returns {string|null} - Decode edilmiş string
 */
const base64UrlDecode = (str) => {
  try {
    // URL-safe Base64 karakterlerini normal Base64'e çevir
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Padding ekle
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // React Native için Base64 decode
    // Farklı ortamlar için kontrol et
    if (typeof atob !== 'undefined') {
      // Web ortamında atob kullan
      return atob(base64);
    } else if (typeof global !== 'undefined' && global.Buffer) {
      // React Native'de global Buffer varsa kullan
      const buffer = global.Buffer.from(base64, 'base64');
      return buffer.toString('utf-8');
    } else if (typeof Buffer !== 'undefined') {
      // Node.js benzeri ortamda Buffer kullan
      const buffer = Buffer.from(base64, 'base64');
      return buffer.toString('utf-8');
    } else {
      // Manuel Base64 decode (fallback)
      return manualBase64Decode(base64);
    }
  } catch (error) {
    return null;
  }
};

/**
 * Manuel Base64 decode fonksiyonu (fallback)
 * @param {string} base64 - Base64 encoded string
 * @returns {string} - Decoded string
 */
const manualBase64Decode = (base64) => {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    let i = 0;
    
    // Remove whitespace
    base64 = base64.replace(/[^A-Za-z0-9\+\/]/g, '');
    
    while (i < base64.length) {
      const encoded1 = chars.indexOf(base64.charAt(i++));
      const encoded2 = chars.indexOf(base64.charAt(i++));
      const encoded3 = chars.indexOf(base64.charAt(i++));
      const encoded4 = chars.indexOf(base64.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      str += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) str += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) str += String.fromCharCode(bitmap & 255);
    }
    
    return str;
  } catch (error) {
    return null;
  }
};

/**
 * URL'den masa parametresini çıkarır ve decode eder
 * @param {string} url - QR kod'dan okunan URL
 * @returns {string|null} - Decode edilmiş masa numarası veya null
 */
export const decodeMasaFromUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // URL'den masa parametresini çıkar
    // Format: https://qr.kilicalpsungur.workers.dev/&masa=ENCRYPTED_STRING
    const masaMatch = url.match(/[&?]masa=([^&]+)/i);
    
    if (!masaMatch || !masaMatch[1]) {
      return null;
    }

    const encryptedMasa = masaMatch[1];
    
    // Base64 URL-safe decode dene
    let decoded = base64UrlDecode(encryptedMasa);
    
    // Decode edilen değeri temizle (boşlukları, yeni satırları kaldır)
    if (decoded) {
      return decoded.trim();
    }

    // Eğer decode başarısızsa, encrypted string'i direkt döndür
    // (belki database'de qr_token olarak saklanıyor)
    return encryptedMasa;

  } catch (error) {
    return null;
  }
};

/**
 * QR kod verisini parse eder (URL veya JSON formatında olabilir)
 * @param {string} data - QR kod'dan okunan ham veri
 * @returns {{masaNo: string|null, qrToken: string|null, isUrl: boolean}}
 */
export const parseQRData = (data) => {
  try {
    // Önce JSON olarak parse etmeyi dene
    try {
      const qrData = JSON.parse(data);
      return {
        masaNo: qrData.masa_no || null,
        qrToken: qrData.qr_token || data,
        isUrl: false
      };
    } catch {
      // JSON değilse, URL olabilir
      if (data.includes('masa=') || data.includes('masa%3D')) {
        // URL formatında, masa parametresini çıkar ve decode et
        const decodedMasa = decodeMasaFromUrl(data);
        return {
          masaNo: decodedMasa,
          qrToken: data, // Orijinal URL'yi token olarak sakla
          isUrl: true
        };
      }
      
      // Ne JSON ne URL, direkt string olarak kabul et
      return {
        masaNo: null,
        qrToken: data,
        isUrl: false
      };
    }
  } catch (error) {
    return {
      masaNo: null,
      qrToken: data,
      isUrl: false
    };
  }
};
