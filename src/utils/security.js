/**
 * Güvenlik Utility Fonksiyonları
 * Input validation, sanitization, ve güvenlik kontrolleri
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'E-posta adresi gereklidir' };
  }
  
  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Geçerli bir e-posta adresi giriniz' };
  }
  
  // Email uzunluk kontrolü
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'E-posta adresi çok uzun' };
  }
  
  return { valid: true, email: trimmedEmail };
};

/**
 * Password validation - güvenli şifre kontrolü
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Şifre gereklidir' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Şifre en az 8 karakter olmalıdır' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Şifre çok uzun (maksimum 128 karakter)' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir küçük harf içermelidir' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir rakam içermelidir' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir özel karakter içermelidir' };
  }
  
  // Yaygın şifre kontrolü
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return { valid: false, error: 'Lütfen daha güvenli bir şifre seçiniz' };
  }
  
  return { valid: true };
};

/**
 * Input sanitization - XSS ve injection saldırılarına karşı
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return String(input || '').trim();
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // HTML tag'lerini kaldır
    .replace(/javascript:/gi, '') // JavaScript protocol'ünü kaldır
    .replace(/on\w+=/gi, ''); // Event handler'ları kaldır
};

/**
 * SQL injection kontrolü (basit)
 */
export const containsSQLInjection = (input) => {
  if (typeof input !== 'string') {
    return false;
  }
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/|'|"|`)/g,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\bUNION\s+SELECT\b)/gi,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * URL validation
 */
export const validateURL = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL gereklidir' };
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Sadece HTTPS'e izin ver (production'da)
    if (parsedUrl.protocol !== 'https:' && !__DEV__) {
      return { valid: false, error: 'Sadece HTTPS URL\'leri desteklenir' };
    }
    
    return { valid: true, url: parsedUrl.href };
  } catch (error) {
    return { valid: false, error: 'Geçersiz URL formatı' };
  }
};

/**
 * Telefon numarası validation
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Telefon numarası gereklidir' };
  }
  
  const cleaned = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/; // Türkiye telefon formatı
  
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Geçerli bir telefon numarası giriniz' };
  }
  
  return { valid: true, phone: cleaned };
};

/**
 * Rate limiting için basit kontrol (local storage kullanarak)
 */
export const checkRateLimit = async (key, maxAttempts = 5, windowMs = 60000) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storageKey = `rate_limit_${key}`;
    const now = Date.now();
    
    const stored = await AsyncStorage.getItem(storageKey);
    
    if (stored) {
      const data = JSON.parse(stored);
      
      // Süre dolmuşsa sıfırla
      if (now - data.timestamp > windowMs) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({
          count: 1,
          timestamp: now,
        }));
        return { allowed: true, remaining: maxAttempts - 1 };
      }
      
      // Limit aşıldıysa
      if (data.count >= maxAttempts) {
        return { 
          allowed: false, 
          remaining: 0,
          retryAfter: Math.ceil((windowMs - (now - data.timestamp)) / 1000),
        };
      }
      
      // Sayacı artır
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        count: data.count + 1,
        timestamp: data.timestamp,
      }));
      
      return { allowed: true, remaining: maxAttempts - data.count - 1 };
    }
    
    // İlk deneme
    await AsyncStorage.setItem(storageKey, JSON.stringify({
      count: 1,
      timestamp: now,
    }));
    
    return { allowed: true, remaining: maxAttempts - 1 };
  } catch (error) {
    // Hata durumunda izin ver (fail-open)
    return { allowed: true, remaining: maxAttempts };
  }
};

/**
 * Sensitive data masking
 */
export const maskSensitiveData = (data, type = 'email') => {
  if (!data || typeof data !== 'string') {
    return '***';
  }
  
  switch (type) {
    case 'email':
      const [local, domain] = data.split('@');
      if (!domain) return '***';
      return `${local.substring(0, 2)}***@${domain}`;
    
    case 'phone':
      return `${data.substring(0, 3)}***${data.substring(data.length - 2)}`;
    
    case 'card':
      return `****${data.substring(data.length - 4)}`;
    
    default:
      return '***';
  }
};

export default {
  validateEmail,
  validatePassword,
  sanitizeInput,
  containsSQLInjection,
  validateURL,
  validatePhone,
  checkRateLimit,
  maskSensitiveData,
};

