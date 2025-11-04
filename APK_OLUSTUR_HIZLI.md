# 🚀 Hızlı APK Oluşturma

## ✅ Durum Kontrolü
- ✅ EAS CLI kurulu
- ✅ EAS'a giriş yapılmış (alpsungurk)
- ✅ eas.json yapılandırılmış
- ✅ app.config.js hazır

## 📱 APK Oluşturma Komutları

### Preview APK (Test için)
```bash
eas build --platform android --profile preview
```
veya
```bash
npm run build:android
```

### Production APK (Yayın için)
```bash
eas build --platform android --profile production
```

## ⏱️ Süre
- İlk build: ~15-20 dakika
- Sonraki build'ler: ~10-15 dakika (cache sayesinde)

## 📥 APK'yı Nereden İndiririm?

1. **Terminal'den**: Build tamamlandığında terminal'de bir link göreceksiniz
2. **Expo Dashboard**: https://expo.dev > Projeniz > Builds sekmesi
3. **Komut ile**: `eas build:list` ile build geçmişini görebilirsiniz

## 🎯 Şimdi Ne Yapmalıyım?

1. Terminal'de şu komutu çalıştırın:
   ```bash
   eas build --platform android --profile preview
   ```

2. Build başladıktan sonra:
   - Terminal'de bir link göreceksiniz
   - Bu linke tıklayarak build durumunu takip edebilirsiniz
   - Build tamamlandığında APK indirme linki gösterilecek

3. APK'yı indirin ve cihazınıza yükleyin!

## ⚠️ Önemli Notlar

- Push notification için Expo Project ID gereklidir
- Build sırasında `.env` dosyasındaki değişkenler kullanılır
- İlk build uzun sürebilir, sabırlı olun

## 🔧 Sorun Olursa

```bash
# Build geçmişini kontrol et
eas build:list

# Build'i iptal et (gerekirse)
eas build:cancel

# Temiz build (cache'siz)
eas build --platform android --profile preview --clear-cache
```

