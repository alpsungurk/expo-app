# Güvenlik Migration Guide

Bu guide, mevcut kodunuzu güvenli utility'leri kullanacak şekilde nasıl güncelleyeceğinizi gösterir.

## 🔄 Console.log Migration

### Adım 1: Logger Import Et

```javascript
import { safeLog, safeError, safeWarn, safeInfo } from '../utils/logger';
```

### Adım 2: Console.log'ları Değiştir

**Önce:**
```javascript
console.log('User logged in:', user.email);
console.error('Error:', error);
console.warn('Warning:', message);
```

**Sonra:**
```javascript
safeLog('User logged in:', user.email);
safeError(error, 'LoginScreen');
safeWarn('Warning:', message);
```

### Adım 3: Sensitive Data Loglamayın

**❌ YANLIŞ:**
```javascript
console.log('Token:', token);
console.log('API Key:', apiKey);
console.log('Password:', password);
```

**✅ DOĞRU:**
```javascript
safeLog('Token alındı'); // Sadece durum loglanır
// Token değeri loglanmaz
```

## 🔄 Error Handling Migration

### Adım 1: Error Handler Import Et

```javascript
import { handleAPIError, logError } from '../utils/errorHandler';
```

### Adım 2: Try-Catch Bloklarını Güncelle

**Önce:**
```javascript
try {
  const result = await apiCall();
} catch (error) {
  console.error('Error:', error);
  showError(error.message);
}
```

**Sonra:**
```javascript
try {
  const result = await apiCall();
} catch (error) {
  const safeError = handleAPIError(error, 'İşlem başarısız oldu');
  showError(safeError.message);
  logError(error, 'ComponentName');
}
```

## 🔄 Input Validation Migration

### Adım 1: Security Utils Import Et

```javascript
import { 
  validateEmail, 
  validatePassword, 
  sanitizeInput,
  validatePhone 
} from '../utils/security';
```

### Adım 2: Input Validation Ekleyin

**Önce:**
```javascript
const handleLogin = async () => {
  if (!email || !password) {
    showError('E-posta ve şifre gereklidir');
    return;
  }
  
  const trimmedEmail = email.trim();
  // ...
};
```

**Sonra:**
```javascript
const handleLogin = async () => {
  // Email validation
  const emailResult = validateEmail(email);
  if (!emailResult.valid) {
    showError(emailResult.error);
    return;
  }
  
  // Password validation
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) {
    showError(passwordResult.error);
    return;
  }
  
  const validatedEmail = emailResult.email;
  // ...
};
```

### Adım 3: User Input'ları Sanitize Edin

**Önce:**
```javascript
const userInput = input.trim();
```

**Sonra:**
```javascript
const userInput = sanitizeInput(input);
```

## 📋 Migration Checklist

Her dosya için:

- [ ] Logger import edildi
- [ ] Console.log'lar safeLog'a çevrildi
- [ ] Console.error'lar safeError'a çevrildi
- [ ] Console.warn'lar safeWarn'a çevrildi
- [ ] Sensitive data loglanmıyor
- [ ] Error handling handleAPIError kullanıyor
- [ ] Input validation eklendi
- [ ] User input'lar sanitize ediliyor

## 🎯 Öncelikli Dosyalar

Aşağıdaki dosyalarda öncelikle migration yapın:

1. `src/screens/LoginScreen.js` - ✅ Kısmen yapıldı
2. `src/screens/SignUpScreen.js`
3. `src/contexts/NotificationContext.js`
4. `src/utils/pushNotification.js`
5. `src/store/appStore.js`

## ⚠️ Dikkat Edilmesi Gerekenler

1. **Sensitive Data**: Token, key, secret, password gibi değerleri asla loglamayın
2. **Error Messages**: Production'da generic mesajlar gösterin
3. **Stack Traces**: Production'da stack trace göstermeyin
4. **User Input**: Her zaman validate ve sanitize edin

## 🔍 Test

Migration sonrası:

1. Development modunda çalıştırın - loglar görünmeli
2. Production build yapın - loglar görünmemeli
3. Error handling test edin - generic mesajlar gösterilmeli
4. Input validation test edin - geçersiz input'lar reddedilmeli

