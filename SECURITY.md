# Güvenlik İyileştirmeleri

Bu dokümantasyon, uygulamaya eklenen güvenlik iyileştirmelerini açıklar.

## 🔒 Yapılan Güvenlik İyileştirmeleri

### 1. Güvenli Logging Sistemi (`src/utils/logger.js`)

- **Production'da console.log'lar devre dışı**: Hassas bilgilerin loglanması önlendi
- **Güvenli error logging**: Production'da sadece generic mesajlar loglanır
- **Stack trace koruması**: Production'da stack trace loglanmaz

**Kullanım:**
```javascript
import { safeLog, safeError, safeWarn } from '../utils/logger';

// Production'da loglanmaz
safeLog('Debug bilgisi');

// Production'da generic mesaj
safeError(error, 'LoginScreen');
```

### 2. Input Validation ve Sanitization (`src/utils/security.js`)

- **Email validation**: Geçerli email formatı kontrolü
- **Password validation**: Güçlü şifre gereksinimleri (min 8 karakter, büyük/küçük harf, rakam, özel karakter)
- **Input sanitization**: XSS ve injection saldırılarına karşı koruma
- **SQL injection kontrolü**: Temel SQL injection pattern'lerini tespit eder
- **URL validation**: Sadece HTTPS URL'lerine izin verir (production'da)
- **Rate limiting**: Local storage kullanarak basit rate limiting

**Kullanım:**
```javascript
import { validateEmail, validatePassword, sanitizeInput } from '../utils/security';

const emailResult = validateEmail(email);
if (!emailResult.valid) {
  showError(emailResult.error);
  return;
}

const passwordResult = validatePassword(password);
if (!passwordResult.valid) {
  showError(passwordResult.error);
  return;
}

const sanitized = sanitizeInput(userInput);
```

### 3. Güvenli Error Handling (`src/utils/errorHandler.js`)

- **Sensitive bilgi koruması**: Production'da stack trace ve detaylı hata mesajları gösterilmez
- **User-friendly mesajlar**: Kullanıcıya anlaşılır hata mesajları
- **API error handling**: Network, timeout, authentication hatalarını güvenli şekilde handle eder

**Kullanım:**
```javascript
import { handleAPIError, logError } from '../utils/errorHandler';

try {
  // API çağrısı
} catch (error) {
  const safeError = handleAPIError(error, 'İşlem başarısız oldu');
  showError(safeError.message);
  logError(error, 'ComponentName');
}
```

### 4. Network Security Configuration

- **Android Network Security Config**: Production'da sadece HTTPS trafiğine izin verir
- **Cleartext traffic yasak**: HTTP trafiği engellenir
- **Supabase domain exception**: Supabase domain'leri için güvenli bağlantı

**Dosya:** `android/app/src/main/res/xml/network_security_config.xml`

### 5. Environment Variables Güvenliği

- **Hardcoded secrets kaldırıldı**: Production'da hardcoded API key'ler ve URL'ler kaldırıldı
- **Environment variable zorunluluğu**: Production'da environment variable'lar zorunlu

**Değişiklikler:**
- `src/config/supabase.js`: Hardcoded Supabase URL kaldırıldı
- `app.config.js`: Hardcoded Google Client ID fallback kaldırıldı

## 📋 Güvenlik Checklist

### Development
- ✅ Console.log'lar development modunda çalışır
- ✅ Detaylı error mesajları gösterilir
- ✅ Debug bilgileri erişilebilir

### Production
- ✅ Console.log'lar devre dışı
- ✅ Stack trace loglanmaz
- ✅ Generic error mesajları
- ✅ Sadece HTTPS trafiği
- ✅ Environment variable zorunluluğu
- ✅ Input validation aktif
- ✅ SQL injection koruması
- ✅ XSS koruması

## 🔐 Environment Variables

Production build için aşağıdaki environment variable'lar **zorunludur**:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-google-client-id
EXPO_PUBLIC_EXPO_PUSH_API_URL=https://your-api-url.com
```

## 🚀 Migration Guide

Mevcut kodunuzu güvenli utility'leri kullanacak şekilde güncelleyin:

### 1. Console.log'ları Değiştirin

**Önce:**
```javascript
console.log('User data:', userData);
console.error('Error:', error);
```

**Sonra:**
```javascript
import { safeLog, safeError } from '../utils/logger';

safeLog('User data:', userData);
safeError(error, 'ComponentName');
```

### 2. Error Handling'i Güncelleyin

**Önce:**
```javascript
catch (error) {
  showError(error.message);
  console.error(error);
}
```

**Sonra:**
```javascript
import { handleAPIError, logError } from '../utils/errorHandler';

catch (error) {
  const safeError = handleAPIError(error);
  showError(safeError.message);
  logError(error, 'ComponentName');
}
```

### 3. Input Validation Ekleyin

**Önce:**
```javascript
const email = emailInput.trim();
```

**Sonra:**
```javascript
import { validateEmail, sanitizeInput } from '../utils/security';

const emailResult = validateEmail(emailInput);
if (!emailResult.valid) {
  showError(emailResult.error);
  return;
}
const email = emailResult.email;
```

## ⚠️ Önemli Notlar

1. **Production build'de environment variable'lar zorunludur** - Eksik olursa uygulama çalışmaz
2. **Console.log kullanmayın** - `safeLog` kullanın
3. **Error mesajlarını direkt göstermeyin** - `handleAPIError` kullanın
4. **User input'ları validate edin** - `validateEmail`, `validatePassword` vb. kullanın
5. **Sensitive data loglamayın** - Production'da loglanmaz ama yine de dikkatli olun

## 🔍 Güvenlik Testleri

1. **Network Security**: HTTP trafiği engellenmeli
2. **Input Validation**: Geçersiz input'lar reddedilmeli
3. **Error Handling**: Production'da sensitive bilgi gösterilmemeli
4. **Logging**: Production build'de console.log çıktısı olmamalı

## 📚 Ek Kaynaklar

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
- [Expo Security Guide](https://docs.expo.dev/guides/security/)

