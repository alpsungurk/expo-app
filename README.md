# ☕ Kahve Dükkanı Mobil Uygulaması

Modern kahve dükkanları için geliştirilmiş kapsamlı müşteri arayüzü. QR kod tarama, dijital menü, sepet yönetimi ve sipariş takibi özellikleri ile tam donanımlı bir uygulama.

## ✨ Özellikler

- 📱 **QR Kod Tarama** - Masa QR kodlarını tarayarak dijital menüye erişim
- 🍽️ **Dijital Menü** - Kategorilere ayrılmış ürün listesi ve detaylı bilgiler
- 🛒 **Sepet Yönetimi** - Ürün ekleme, çıkarma ve miktar güncelleme
- ⚙️ **Ürün Özelleştirme** - Boyut, süt türü, şeker miktarı gibi seçenekler
- 📋 **Sipariş Takibi** - Gerçek zamanlı sipariş durumu güncellemeleri
- 🎯 **Kampanya Slider** - Animasyonlu kampanya ve duyuru gösterimi
- 💳 **Ödeme Entegrasyonu** - Iyzico/Stripe placeholder ile ödeme sistemi
- 🎨 **Kahve Teması** - Sıcak kahve renkleri ve modern tasarım
- 📊 **Supabase Entegrasyonu** - Gerçek zamanlı veritabanı bağlantısı

## 📁 Proje Yapısı

```
expo-app/
├── src/
│   ├── components/              # Yeniden kullanılabilir bileşenler
│   │   ├── QRScanner.js        # QR kod tarama bileşeni
│   │   ├── TableHeader.js      # Masa başlığı bileşeni
│   │   ├── CampaignSlider.js   # Kampanya slider bileşeni
│   │   ├── CategoryCard.js     # Kategori kartı bileşeni
│   │   ├── ProductCard.js      # Ürün kartı bileşeni
│   │   └── Card.js             # Genel kart bileşeni
│   ├── config/                 # Konfigürasyon dosyaları
│   │   └── supabase.js         # Supabase bağlantı ayarları
│   ├── navigation/             # Navigasyon yapısı
│   │   └── AppNavigator.js     # Ana navigasyon
│   ├── screens/                # Uygulama ekranları
│   │   ├── HomeScreen.js       # Ana sayfa ve menü
│   │   ├── ProductDetailScreen.js # Ürün detay sayfası
│   │   ├── CartScreen.js       # Sepet sayfası
│   │   └── OrderStatusScreen.js # Sipariş takip sayfası
│   └── store/                  # State yönetimi
│       ├── cartStore.js        # Sepet state yönetimi
│       └── appStore.js         # Uygulama state yönetimi
├── assets/                     # Görseller ve medya dosyaları
├── App.js                     # Ana uygulama dosyası
├── app.json                   # Expo konfigürasyonu
└── package.json              # Proje bağımlılıkları
```

## 🚀 Kurulum

### Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn
- Expo CLI

### Adımlar

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Uygulamayı Başlatın:**
   ```bash
   npm start
   # veya
   expo start
   ```

3. **Platform Seçimi:**
   - **iOS için:** `i` tuşuna basın veya `npm run ios`
   - **Android için:** `a` tuşuna basın veya `npm run android`
   - **Web için:** `w` tuşuna basın veya `npm run web`

## 📱 Ekranlar

### 🏠 Ana Sayfa / Menü
- QR kod tarama butonu
- Kampanya ve duyuru slider'ı
- Kategori filtreleme
- Ürün listesi ve arama
- Sepete hızlı ekleme

### 📱 Ürün Detayı
- Ürün görseli ve açıklaması
- Özelleştirme seçenekleri (boyut, süt, şeker)
- Miktar seçimi
- Sepete ekleme

### 🛒 Sepet
- Sepetteki ürünlerin listesi
- Miktar güncelleme
- Toplam tutar hesaplama
- Sipariş verme

### 📋 Sipariş Takibi
- Sipariş durumu (Beklemede, Hazırlanıyor, Hazır, Teslim Edildi)
- Gerçek zamanlı güncellemeler
- Tahmini hazırlık süresi
- Sipariş detayları

## 🛠️ Kullanılan Teknolojiler

- **React Native** - Mobil uygulama framework'ü
- **Expo** - Hızlı geliştirme platformu
- **React Navigation** - Navigasyon çözümü
- **Supabase** - Backend ve veritabanı
- **Zustand** - State yönetimi
- **Expo Camera** - QR kod tarama
- **Expo Vector Icons** - Icon kütüphanesi
- **Expo Linear Gradient** - Gradient efektleri

## 📦 Bağımlılıklar

```json
{
  "expo": "~54.0.13",
  "react": "19.1.0",
  "react-native": "0.81.4",
  "@react-navigation/native": "^7.0.14",
  "@react-navigation/bottom-tabs": "^7.2.3",
  "@react-navigation/stack": "^7.1.1",
  "react-native-safe-area-context": "5.0.3",
  "react-native-screens": "~4.7.3",
  "@expo/vector-icons": "^15.0.8",
  "react-native-gesture-handler": "~2.22.2",
  "@supabase/supabase-js": "^2.39.0",
  "expo-camera": "~15.0.16",
  "expo-barcode-scanner": "~13.0.1",
  "expo-linear-gradient": "~13.0.2",
  "react-native-pager-view": "6.4.1",
  "zustand": "^4.4.7"
}
```

## 🎨 Tasarım

Uygulama, kahve dükkanı temasına uygun modern bir tasarım anlayışıyla geliştirilmiştir:
- Sıcak kahve renk paleti (#8B4513, #A0522D, #D2B48C)
- Yumuşak gölgeler ve yuvarlatılmış köşeler
- Responsive layout ve mobil optimizasyon
- Kullanıcı dostu arayüz ve sezgisel navigasyon
- Animasyonlu kampanya slider'ı
- Gerçek zamanlı sipariş durumu güncellemeleri

## 🔧 Environment Variables

Supabase bağlantısı için environment variables ayarlayın:

### Yöntem 1: .env Dosyası (Önerilen)
Proje kök dizininde `.env` dosyası oluşturun:

```bash
# .env dosyası
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Yöntem 2: app.config.js
`app.config.js` dosyasındaki `extra` bölümünü güncelleyin:

```javascript
extra: {
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-key-here"
}
```

### Supabase Bilgilerini Alma:
1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. Projenizi seçin
3. Settings > API bölümünden URL ve anon key'i kopyalayın

## 📦 APK Oluşturma (Release Build)

Uygulamanızı APK formatında oluşturmak için iki yöntem mevcuttur:

### Yöntem 1: EAS Build (Önerilen - Kolay ve Hızlı) ☁️

EAS Build, Expo'nun bulut tabanlı build servisidir. En kolay ve önerilen yöntemdir.

#### Adımlar:

1. **EAS CLI'ı Global Olarak Kurun:**
   ```bash
   npm install -g eas-cli
   ```

2. **EAS'e Giriş Yapın:**
   ```bash
   eas login
   ```
   Expo hesabı oluşturmanız gerekebilir (ücretsiz).

3. **EAS Build Konfigürasyonu Oluşturun:**
   ```bash
   eas build:configure
   ```
   Bu komut `eas.json` dosyası oluşturur.

4. **Android APK Build Başlatın:**
   ```bash
   eas build --platform android --profile preview
   ```
   İlk build yaklaşık 15-20 dakika sürebilir.

5. **APK'yı İndirin:**
   - Build tamamlandığında terminal'de bir link göreceksiniz
   - Bu linke tıklayarak APK'yı indirebilirsiniz
   - Veya `eas build:list` komutuyla tüm build'lerinizi görebilirsiniz

#### APK'yı Nereden Alırsınız?

Build tamamlandıktan sonra:
- Terminal'de görünen indirme linkini kullanın
- Veya [Expo Dashboard](https://expo.dev)'a giriş yapıp projenizdeki "Builds" sekmesinden indirebilirsiniz

### Yöntem 2: Lokal Build (Android Studio ile) 🏠

Bilgisayarınızda direkt olarak APK oluşturmak için:

#### Ön Gereksinimler:
- Android Studio kurulu olmalı
- Android SDK kurulu olmalı
- Java JDK kurulu olmalı

#### Adımlar:

1. **Keystore Oluşturun (İlk Kez İse):**
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
   Şifre belirleyin ve bilgileri girin.

2. **Keystore Konfigürasyonu:**
   `android/gradle.properties` dosyasına ekleyin:
   ```properties
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your-store-password
   MYAPP_RELEASE_KEY_PASSWORD=your-key-password
   ```

3. **Android Studio'da Build:**
   - Android Studio'yu açın
   - `File > Open` ile `android` klasörünü açın
   - `Build > Generate Signed Bundle / APK` seçin
   - APK seçin
   - Keystore'u seçin ve şifreleri girin
   - Build variant: `release` seçin
   - Finish'e tıklayın

4. **APK Konumu:**
   Build tamamlandıktan sonra APK şu konumda olacak:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

#### Alternatif: Gradle Komutları ile

Terminal'den direkt build yapmak için:

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

APK şu konumda olacak:
```
android/app/build/outputs/apk/release/app-release.apk
```

Veya npm script kullanarak:
```bash
npm run build:android:local
```

### Hangi Yöntemi Seçmeliyim?

- **EAS Build** önerilir çünkü:
  - ✅ Kolay kurulum
  - ✅ Bulut üzerinde build (bilgisayarınızı yormaz)
  - ✅ Otomatik keystore yönetimi
  - ✅ Her build için indirme linki
  - ✅ Build geçmişi takibi

- **Lokal Build** kullanın eğer:
  - İnternet bağlantınız yavaşsa
  - Build sürecini tam kontrol etmek istiyorsanız
  - Özel Gradle konfigürasyonları yapmanız gerekiyorsa

## 🤖 Android Studio ile Çalıştırma

Android Studio'dan uygulamayı çalıştırmak için şu adımları izleyin:

### Ön Gereksinimler
- Android Studio kurulu olmalı
- Android SDK ve platform tools kurulu olmalı
- ADB (Android Debug Bridge) PATH'te olmalı
- USB ile bağlı fiziksel cihaz veya çalışan Android emulator

### Adımlar

1. **Metro Bundler'ı Başlatın:**
   ```bash
   npm start
   # veya
   npm run metro
   ```
   Metro bundler'ın çalıştığından emin olun (terminal'de "Metro waiting on..." mesajını görmelisiniz).

2. **ADB Reverse Port Forwarding (USB Bağlantısı İçin):**
   Fiziksel cihaz kullanıyorsanız, USB bağlantısı için port forwarding yapın:
   ```bash
   npm run android:studio
   # veya manuel olarak:
   adb reverse tcp:8081 tcp:8081
   ```

3. **Android Studio'da Projeyi Açın:**
   - Android Studio'yu açın
   - `File > Open` ile `android` klasörünü seçin
   - Gradle sync'in tamamlanmasını bekleyin

4. **Uygulamayı Çalıştırın:**
   - Android Studio'da Run butonuna tıklayın (▶️)
   - Veya `Shift + F10` tuşlarına basın
   - Cihaz/emulator seçimini yapın

### Sorun Giderme

**"Unable to load script" Hatası:**
- Metro bundler'ın çalıştığından emin olun (`npm start`)
- USB bağlantısı için `adb reverse tcp:8081 tcp:8081` komutunu çalıştırın
- Emulator kullanıyorsanız, bilgisayarınızla aynı Wi-Fi ağında olduğundan emin olun
- Metro bundler'ı yeniden başlatın: `npm run start:reset`

**Port 8081 Zaten Kullanımda:**
- Metro bundler'ı farklı bir portta başlatın: `expo start --port 8082`
- Veya kullanan işlemi sonlandırın

**ADB Komutu Bulunamıyor:**
- Android Studio > Settings > Appearance & Behavior > System Settings > Android SDK
- SDK Tools sekmesinde "Android SDK Platform-Tools" seçili olduğundan emin olun
- PATH'e ekleyin: `%LOCALAPPDATA%\Android\Sdk\platform-tools` (Windows)

## 📝 Notlar

- Uygulamayı ilk kez çalıştırmadan önce `npm install` komutunu çalıştırmayı unutmayın
- Supabase konfigürasyonu için yukarıdaki environment variables'ları ayarlayın
- iOS simulator için macOS gereklidir
- Android emulator için Android Studio kurulu olmalıdır
- QR kod tarama özelliği için kamera izni gereklidir
- Veritabanı tabloları Supabase'de oluşturulmuş olmalıdır
- `.env` dosyasını git'e eklemeyin (güvenlik için)
- **Android Studio'dan çalıştırırken mutlaka Metro bundler'ı önce başlatın**

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce değişikliklerinizi test edin.

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

💻 **Geliştirici İpuçları:**
- `expo start --clear` komutuyla cache temizleyebilirsiniz
- Hata ayıklama için Chrome DevTools kullanabilirsiniz
- Hot reload özelliği ile değişiklikler anında görünür
- Supabase realtime özelliklerini test etmek için birden fazla cihaz kullanın
- QR kod test etmek için masa QR kodlarını önceden oluşturun

☕ **Kahve Dükkanı Uygulaması Hazır!**

Bu uygulama modern kahve dükkanları için tam donanımlı bir müşteri arayüzü sunar. QR kod tarama, dijital menü, sepet yönetimi ve sipariş takibi gibi tüm temel özellikler mevcuttur.

