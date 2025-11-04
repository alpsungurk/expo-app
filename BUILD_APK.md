# 📱 APK Oluşturma - Adım Adım

## Hazırlık Durumu ✅
- ✅ EAS CLI kurulu
- ✅ EAS'a giriş yapılmış
- ✅ eas.json yapılandırılmış

## 🚀 APK Oluşturma

### Komut 1: Preview APK (Önerilen - Test için)

Terminal'de şu komutu çalıştırın:

```bash
eas build --platform android --profile preview
```

Bu komut:
- EAS project'i otomatik oluşturur (ilk seferinde)
- Preview profili ile APK build eder
- Build durumunu terminal'de gösterir
- Tamamlandığında indirme linki verir

### Komut 2: Production APK (Play Store için)

```bash
eas build --platform android --profile production
```

## 📋 Build Süreci

1. **Build Başlatıldı**: Terminal'de "Starting build..." mesajı görünür
2. **Build Linki**: Terminal'de bir URL gösterilir (örn: https://expo.dev/accounts/alpsungurk/projects/expo-app/builds/xxx)
3. **Build İşlemi**: Bu linke tıklayarak build durumunu takip edebilirsiniz
4. **Tamamlandı**: Build tamamlandığında APK indirme linki gösterilir

## ⏱️ Beklenen Süre

- İlk build: ~15-20 dakika
- Sonraki build'ler: ~10-15 dakika

## 📥 APK İndirme

Build tamamlandıktan sonra:

1. **Terminal'den**: Terminal'deki indirme linkine tıklayın
2. **Expo Dashboard**: https://expo.dev > Projeniz > Builds > En son build > Download

## 🎯 Hızlı Komut

```bash
npm run build:android
```

Bu komut `eas build --platform android --profile preview` komutunu çalıştırır.

## ⚠️ Önemli Notlar

1. **Expo Project ID**: Push notification için `.env` dosyasına `EXPO_PUBLIC_PROJECT_ID` ekleyin
2. **Environment Variables**: `.env` dosyasındaki değişkenler build sırasında kullanılır
3. **İlk Build**: İlk build uzun sürebilir, sabırlı olun

## 🔧 Sorun Giderme

### Build başlamıyor
```bash
# EAS'a tekrar giriş yap
eas login

# Project'i kontrol et
eas project:info
```

### Build hatası
```bash
# Build log'larını kontrol et
eas build:list

# Son build'in detaylarını gör
eas build:view [BUILD_ID]
```

### Cache temizleme
```bash
eas build --platform android --profile preview --clear-cache
```

## 📝 Sonraki Adımlar

1. APK'yı indirin
2. Android cihazınıza yükleyin
3. Test edin
4. Gerekirse tekrar build edin

