# 📱 Expo APK Oluşturma Kılavuzu

Bu kılavuz, Expo projeniz için Android APK dosyası oluşturmanın adımlarını açıklar.

## 🚀 Yöntem 1: EAS Build (Önerilen - Bulut Tabanlı)

EAS Build, Expo'nun bulut tabanlı build servisidir. En kolay ve hızlı yöntemdir.

### Adım 1: EAS CLI Kurulumu

```bash
npm install -g eas-cli
```

### Adım 2: Expo Hesabına Giriş

```bash
eas login
```

Eğer Expo hesabınız yoksa, ücretsiz olarak oluşturabilirsiniz.

### Adım 3: EAS Build Konfigürasyonu

`eas.json` dosyanız zaten mevcut ve yapılandırılmış. Eğer yoksa:

```bash
eas build:configure
```

### Adım 4: Android APK Build

```bash
eas build --platform android --profile preview
```

Veya production build için:

```bash
eas build --platform android --profile production
```

### Adım 5: Build İşlemini Takip Etme

- Build başladıktan sonra terminal'de bir link göreceksiniz
- Bu linke tıklayarak build durumunu takip edebilirsiniz
- Build tamamlandığında (yaklaşık 15-20 dakika) APK indirme linki gösterilecek

### Adım 6: APK'yı İndirme

Build tamamlandıktan sonra:
- Terminal'deki indirme linkini kullanın
- Veya [Expo Dashboard](https://expo.dev) > Builds sekmesinden indirin

## 🏠 Yöntem 2: Lokal Build (Android Studio ile)

Bilgisayarınızda direkt olarak APK oluşturmak için:

### Ön Gereksinimler

- ✅ Android Studio kurulu olmalı
- ✅ Android SDK kurulu olmalı
- ✅ Java JDK kurulu olmalı
- ✅ Android klasörü oluşturulmuş olmalı (`expo prebuild` ile)

### Adım 1: Prebuild (Android Klasörü Oluşturma)

Eğer `android` klasörü yoksa:

```bash
expo prebuild --platform android
```

### Adım 2: Keystore Oluşturma (İlk Kez İse)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Şifre belirleyin ve bilgileri girin.

### Adım 3: Keystore Konfigürasyonu

`android/gradle.properties` dosyasına ekleyin:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

### Adım 4: Gradle ile Build

**Windows:**
```bash
cd android
gradlew.bat assembleRelease
```

**macOS/Linux:**
```bash
cd android
./gradlew assembleRelease
```

**Veya npm script ile:**
```bash
npm run build:android:local
```

### Adım 5: APK Konumu

Build tamamlandıktan sonra APK şu konumda olacak:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Build Profilleri (eas.json)

Projenizde 3 build profili tanımlı:

### 1. Development
- Development client ile
- Debug build
- Test için

### 2. Preview
- APK formatında
- Internal distribution
- Test ve dağıtım için

### 3. Production
- APK formatında
- Production build
- Play Store için

## ⚙️ app.config.js Ayarları

APK oluşturmadan önce kontrol edin:

- ✅ `android.package` - Paket adı (com.kahvedukkani.app)
- ✅ `android.permissions` - Gerekli izinler
- ✅ `version` - Uygulama versiyonu
- ✅ `icon` ve `splash` - Icon ve splash screen dosyaları

## 🔍 Build Öncesi Kontrol Listesi

- [ ] `.env` dosyasında gerekli environment variables var mı?
- [ ] `app.config.js` dosyası doğru yapılandırılmış mı?
- [ ] Icon ve splash screen dosyaları mevcut mu?
- [ ] `eas.json` dosyası yapılandırılmış mı?
- [ ] EAS CLI kurulu ve giriş yapılmış mı? (EAS Build için)

## 🐛 Sorun Giderme

### "EAS CLI not found"
```bash
npm install -g eas-cli
```

### "You are not logged in"
```bash
eas login
```

### "Android folder not found"
```bash
expo prebuild --platform android
```

### Build Hatası
- Terminal'deki hata mesajlarını kontrol edin
- `expo prebuild --clean` ile temizleyip tekrar deneyin
- `eas build:list` ile build geçmişini kontrol edin

## 📦 APK Boyutu Optimizasyonu

APK boyutunu küçültmek için:

1. **Proguard/R8 Kullanın** - `android/app/build.gradle` içinde:
```gradle
buildTypes {
  release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
  }
}
```

2. **Gereksiz Asset'leri Kaldırın**
3. **Kullanılmayan Paketleri Kaldırın**

## 🎯 Hızlı Başlangıç

En hızlı yöntem (EAS Build):

```bash
# 1. EAS CLI kur
npm install -g eas-cli

# 2. Giriş yap
eas login

# 3. APK oluştur
eas build --platform android --profile preview
```

## 📝 Notlar

- İlk build yaklaşık 15-20 dakika sürebilir
- Sonraki build'ler daha hızlı olur (cache sayesinde)
- EAS Build ücretsiz planında aylık build limiti vardır
- Production build için keystore yönetimi EAS tarafından yapılır

## 🔗 Yararlı Linkler

- [EAS Build Dokümantasyonu](https://docs.expo.dev/build/introduction/)
- [Expo Dashboard](https://expo.dev)
- [Android Build Ayarları](https://docs.expo.dev/build/android/)

