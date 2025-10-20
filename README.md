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

## 📝 Notlar

- Uygulamayı ilk kez çalıştırmadan önce `npm install` komutunu çalıştırmayı unutmayın
- Supabase konfigürasyonu için yukarıdaki environment variables'ları ayarlayın
- iOS simulator için macOS gereklidir
- Android emulator için Android Studio kurulu olmalıdır
- QR kod tarama özelliği için kamera izni gereklidir
- Veritabanı tabloları Supabase'de oluşturulmuş olmalıdır
- `.env` dosyasını git'e eklemeyin (güvenlik için)

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

