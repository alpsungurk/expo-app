# 🔧 Build Hatası Çözüm Kılavuzu

## ❌ Mevcut Durum
Build başarısız oldu: "Unknown error. See logs of the Prebuild build phase for more information."

## 🔍 Adım 1: Log'ları İnceleyin

Build log'larını kontrol edin:
https://expo.dev/accounts/alpsungurk/projects/expo-app/builds/85ae64ea-c8f7-4851-97c9-07edd17916ad

Log'larda "Prebuild" aşamasındaki hatayı arayın.

## 🛠️ Olası Çözümler

### Çözüm 1: Prebuild Temizle ve Tekrar Dene

```bash
# Lokal prebuild'i temizle
expo prebuild --clean

# Tekrar build et
eas build --platform android --profile preview
```

### Çözüm 2: Android Klasörünü Kontrol Et

Eğer `android` klasörü varsa ve sorunluysa:

```bash
# Android klasörünü sil (gerekirse)
rm -rf android  # macOS/Linux
# veya
rmdir /s android  # Windows

# Temiz prebuild
expo prebuild --platform android --clean

# Tekrar build et
eas build --platform android --profile preview
```

### Çözüm 3: app.config.js Kontrolü

`app.config.js` dosyasında şunları kontrol edin:

- ✅ Tüm asset dosyaları mevcut (`icon.png`, `splash-icon.png`, `adaptive-icon.png`)
- ✅ `android.package` doğru
- ✅ `plugins` array'i doğru formatlanmış
- ✅ `extra.eas.projectId` eklendi

### Çözüm 4: Cache Temizle

```bash
# EAS cache temizle
eas build --platform android --profile preview --clear-cache

# Veya lokal cache temizle
expo prebuild --clean
npm run start:reset
```

### Çözüm 5: Plugin Sorunları

Eğer log'larda plugin hatası görüyorsanız:

```bash
# node_modules'ü temizle ve yeniden yükle
rm -rf node_modules
npm install

# Tekrar build et
eas build --platform android --profile preview
```

## 📋 Kontrol Listesi

Build öncesi kontrol edin:

- [ ] `app.config.js` syntax hatası yok
- [ ] Tüm asset dosyaları mevcut ve geçerli
- [ ] `eas.json` yapılandırılmış
- [ ] `extra.eas.projectId` eklendi
- [ ] Node modules yüklü (`npm install`)

## 🔗 Build Log Linki

Detaylı hata mesajını görmek için:
https://expo.dev/accounts/alpsungurk/projects/expo-app/builds/85ae64ea-c8f7-4851-97c9-07edd17916ad

## 💡 En Yaygın Hatalar

1. **Asset dosyası eksik**: Icon veya splash screen dosyası bulunamıyor
2. **Plugin hatası**: `expo-notifications` plugin'i yüklenemiyor
3. **Android klasörü sorunu**: Prebuild aşamasında Android klasörü oluşturulamıyor
4. **Syntax hatası**: `app.config.js` dosyasında syntax hatası

## 🚀 Hızlı Çözüm

En hızlı çözüm denemek için:

```bash
# 1. Temizle
expo prebuild --clean

# 2. Cache temizle
npm run start:reset

# 3. Tekrar build et
eas build --platform android --profile preview --clear-cache
```

