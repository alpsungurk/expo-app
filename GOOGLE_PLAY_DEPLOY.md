# Google Play Store Yükleme Rehberi (Local Build)

Bu rehber, İlk Coffee uygulamasını Google Play Store'a yükleme adımlarını içerir. **Local build** kullanarak bilgisayarınızda AAB dosyası oluşturacağız.

## Ön Hazırlık

### 1. Google Play Console Hesabı
- Google Play Console hesabınızın olduğundan emin olun
- Gerekirse: https://play.google.com/console
- Developer hesabı için tek seferlik $25 ödeme gereklidir

### 2. Java JDK Kurulumu
- **Java JDK 17 veya 21 (LTS)** kurulu olmalı
- **Java 25 desteklenmiyor!** Gradle 8.14.3 Java 25'ı desteklemez
- Kontrol etmek için: `java -version`
- İndirme: https://www.oracle.com/java/technologies/downloads/
- **Önemli:** Java 25 kullanıyorsanız, Java 21 veya 17'ye geçmeniz gerekiyor

### 3. Android Studio (Opsiyonel)
- Android Studio kurulu olması önerilir ama zorunlu değil
- Gradle komutlarını terminal'den çalıştırabilirsiniz

## Keystore Oluşturma (İlk Kez)

Google Play Store için uygulamanızı imzalamak için bir keystore dosyası oluşturmanız gerekiyor.

### Windows için:
```bash
cd android
.\create-keystore.bat
```

**Not:** PowerShell'de mevcut dizindeki script'leri çalıştırmak için `.\` öneki gereklidir.

### Mac/Linux için:
```bash
cd android
chmod +x create-keystore.sh
./create-keystore.sh
```

### Manuel Oluşturma:
Eğer script çalışmazsa, manuel olarak (tüm sorulara Enter'a basarak geçebilirsiniz):

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Ilk Coffee, OU=Development, O=Ilk Coffee, L=Istanbul, ST=Istanbul, C=TR"
```

**Not:** `-dname` parametresi ile sertifika bilgilerini otomatik doldurur, interaktif sorular sormaz.

**ÖNEMLİ:** 
- Keystore şifrelerini ve dosyasını **GÜVENLİ TUTUN**!
- Keystore'u kaybederseniz, uygulamanızı güncelleyemezsiniz!
- Keystore dosyasını `.gitignore`'a ekleyin!

### Keystore Bilgilerini Yapılandırma

Keystore oluşturduktan sonra, `android/gradle.properties` dosyasını açın ve şu satırların yorumlarını kaldırıp değerlerini doldurun:

```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=release-key
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

## Build Oluşturma

### 1. JavaScript Bundle Oluşturma ve AAB Build

**ÖNEMLİ:** Build komutunu **proje root dizininden** çalıştırın (android klasörü içinden değil)!

Google Play Store için **AAB (Android App Bundle)** formatında build oluşturun:

```bash
npm run build:android:local:aab
```

Bu komut:
1. JavaScript bundle'ı otomatik oluşturur (Gradle build sırasında)
2. Android App Bundle (AAB) dosyasını oluşturur

### 2. Temiz Build (Önerilir)

Eğer önceki build'lerden kalıntılar varsa:

```bash
npm run build:android:local:aab:clean
```

**Not:** Eğer "Error resolving plugin" hatası alırsanız, komutun proje root dizininden çalıştırıldığından emin olun.

### 3. Build Dosyası Konumu

Build tamamlandıktan sonra AAB dosyası şu konumda olacak:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### 4. APK Oluşturma (Test İçin)

Eğer test için APK istiyorsanız:

```bash
npm run build:android:local:apk
```

APK dosyası:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Google Play Console'a Yükleme

### 1. Yeni Uygulama Oluşturma (İlk Yükleme)

1. **Google Play Console'a giriş yapın**: https://play.google.com/console
2. **"Uygulama oluştur"** butonuna tıklayın
3. **Uygulama bilgilerini doldurun**:
   - Uygulama adı: `İlk Coffee`
   - Varsayılan dil: `Türkçe (tr)`
   - Uygulama veya oyun: `Uygulama`
   - Ücretsiz mi yoksa ücretli mi: `Ücretsiz`
   - Bildirimler: Gerekli bildirimleri kabul edin

### 2. Uygulama İçeriği Hazırlama

#### A. Uygulama Erişimi ve Fiyatlandırma
- **Fiyatlandırma**: Ücretsiz olarak ayarlayın
- **Kullanılabilirlik**: Tüm ülkeler veya belirli ülkeler seçin

#### B. Uygulama İçeriği
- **Ekran görüntüleri**: En az 2 adet (telefon için)
  - Minimum boyut: 320px
  - Maksimum boyut: 3840px
  - En boy oranı: 16:9 veya 9:16
- **Özellik grafiği**: 1024 x 500 piksel (opsiyonel ama önerilir)
- **Uygulama simgesi**: 512 x 512 piksel (yüksek kaliteli)
- **Kısa açıklama**: 80 karakter (Türkçe)
- **Tam açıklama**: 4000 karakter (Türkçe)
- **Kategori**: Uygulamanızın kategorisini seçin (örn: Yiyecek ve İçecek)

#### C. Uygulama İçeriği Örnekleri

**Kısa Açıklama (80 karakter):**
```
Kahve dükkanı uygulaması - Sipariş verin, kampanyaları takip edin
```

**Tam Açıklama (4000 karakter):**
```
İlk Coffee uygulaması ile kahve dünyasının keyfini çıkarın!

Özellikler:
• Kolay sipariş verme sistemi
• QR kod ile hızlı ödeme
• Özel kampanyalar ve indirimler
• Sipariş takibi
• Anlık bildirimler
• Güvenli ödeme seçenekleri

Uygulamamız ile:
- Menüyü inceleyin
- Favori ürünlerinizi seçin
- Hızlıca sipariş verin
- Sipariş durumunuzu takip edin
- Özel kampanyalardan haberdar olun

Güvenli ve kolay kullanım için tasarlandı.
```

### 3. Production Build Yükleme

1. **"Production" sekmesine** gidin (sol menüden)
2. **"Yeni sürüm oluştur"** butonuna tıklayın
3. **AAB dosyasını yükleyin**:
   - Build'den indirdiğiniz `.aab` dosyasını seçin
   - Google Play Console dosyayı analiz edecek
4. **Sürüm notları** ekleyin (Türkçe):
   ```
   İlk sürüm yayınlandı!
   - Temel sipariş verme özellikleri
   - QR kod ödeme sistemi
   - Bildirim sistemi
   ```

### 4. İçerik Derecelendirme

1. **"İçerik derecelendirme"** sekmesine gidin
2. **Anketi doldurun**:
   - Uygulamanızın içeriğine göre soruları cevaplayın
   - Genellikle "Tüm yaşlar için uygun" seçeneği uygundur
3. Derecelendirme sertifikası alın

### 5. Hedef Kitle ve İçerik

1. **"Hedef kitle ve içerik"** sekmesine gidin
2. **Hedef kitle yaş aralığı** seçin
3. **İçerik formunu** doldurun:
   - Veri güvenliği
   - Veri paylaşımı
   - Uygulama erişimleri

### 6. Gizlilik Politikası

1. **"Uygulama içeriği"** altında **"Gizlilik politikası"** bölümüne gidin
2. Gizlilik politikası URL'si ekleyin (web sitenizde yayınlanmış olmalı)
3. Eğer yoksa, hızlıca bir gizlilik politikası oluşturun

### 7. Uygulama İmzalama

EAS Build otomatik olarak uygulamanızı imzalar. Ekstra bir işlem yapmanıza gerek yok.

### 8. İnceleme ve Yayınlama

1. Tüm bölümleri tamamladıktan sonra **"Gönder"** butonuna tıklayın
2. Google Play ekibi uygulamanızı inceleyecek
3. İnceleme süreci genellikle **1-3 gün** sürer
4. Onaylandıktan sonra uygulama Play Store'da yayınlanır

## Sürüm Güncelleme

Yeni bir sürüm yüklemek için:

1. **app.config.js** dosyasında versiyon numaralarını güncelleyin:
   ```javascript
   version: '1.0.1',  // Kullanıcıya gösterilen versiyon
   android: {
     versionCode: 2,  // Her yeni build için artırılmalı (1, 2, 3, ...)
   }
   ```

2. **android/app/build.gradle** dosyasında da versiyon numaralarını güncelleyin:
   ```gradle
   versionCode 2
   versionName "1.0.1"
   ```

3. Yeni build oluşturun:
   ```bash
   npm run build:android:local:aab
   ```

4. Google Play Console'da:
   - Production sekmesine gidin
   - "Yeni sürüm oluştur" butonuna tıklayın
   - Yeni AAB dosyasını yükleyin (`android/app/build/outputs/bundle/release/app-release.aab`)
   - Sürüm notlarını ekleyin
   - Gönderin

## Önemli Notlar

### Version Code
- Her yeni build için `versionCode` mutlaka artırılmalıdır
- Google Play, aynı veya daha düşük version code'lu build'leri kabul etmez
- `versionCode` sadece tam sayı olabilir (1, 2, 3, ...)

### Version Name
- `version` (versionName) kullanıcıya gösterilen versiyondur
- "1.0.0", "1.0.1", "1.1.0" gibi formatlar kullanılabilir
- Her build'de değiştirilmesi zorunlu değildir, ama önerilir

### Keystore Yönetimi
- Keystore dosyasını (`android/app/release.keystore`) **ASLA KAYBETMEYİN**!
- Eğer kaybederseniz, uygulamanızı güncelleyemezsiniz
- Keystore'u güvenli bir yerde yedekleyin (şifreli bulut depolama, USB, vb.)
- Keystore şifrelerini güvenli bir şifre yöneticisinde saklayın
- Keystore dosyasını `.gitignore`'a eklediğinizden emin olun

### Test
- Production'a yüklemeden önce **Internal Testing** veya **Closed Testing** ile test edin
- Test build'i için: `npm run build:android:local:apk` (APK formatında)

## Sorun Giderme

### Build Hataları

#### "Keystore file not found" Hatası
- `android/app/release.keystore` dosyasının var olduğundan emin olun
- `gradle.properties` dosyasındaki `MYAPP_RELEASE_STORE_FILE` yolunu kontrol edin

#### "Signing config not found" Hatası
- `gradle.properties` dosyasındaki keystore bilgilerinin doğru olduğundan emin olun
- Tüm keystore property'lerinin yorum satırı olmadığından emin olun

#### "Failed to read key" veya "Given final block not properly padded" Hatası
- Keystore dosyası bozuk veya şifre yanlış olabilir
- Keystore'u yeniden oluşturun: `cd android && .\create-keystore.bat`
- `gradle.properties` dosyasındaki şifrelerin doğru olduğundan emin olun
- Eski keystore dosyasını silin: `android/app/release.keystore`

#### "Gradle build failed" Hatası
- `cd android && gradlew.bat clean` komutu ile temizleyin
- `npm install` ile bağımlılıkları güncelleyin
- Java JDK versiyonunu kontrol edin (`java -version`)
- **"Unsupported class file major version"** hatası alıyorsanız, Java 17 veya 21 kullanın (Java 25 desteklenmiyor)

#### "expo export:embed" Hatası
- `npx expo install --fix` komutu ile bağımlılıkları düzeltin
- `npm start -- --reset-cache` ile cache'i temizleyin

### Yükleme Hataları
- AAB dosyasının doğru formatta olduğundan emin olun (`.aab` uzantılı)
- Version code'un önceki sürümden yüksek olduğundan emin olun
- Tüm gerekli bilgilerin doldurulduğundan emin olun
- Keystore ile imzalanmış olduğundan emin olun

### İnceleme Reddi
- Google Play Console'dan red nedenlerini okuyun
- Gerekli düzeltmeleri yapın
- Yeni bir build oluşturup tekrar gönderin

## Faydalı Komutlar

```bash
# AAB build oluştur (Google Play için)
npm run build:android:local:aab

# Temiz AAB build
npm run build:android:local:aab:clean

# APK build oluştur (test için)
npm run build:android:local:apk

# Android projesini temizle
cd android && gradlew.bat clean

# Gradle wrapper'ı güncelle
cd android && gradlew.bat wrapper --gradle-version=8.3

# Build dosyalarını kontrol et
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Build Dosyalarının Konumları

- **AAB (Google Play için):** `android/app/build/outputs/bundle/release/app-release.aab`
- **APK (Test için):** `android/app/build/outputs/apk/release/app-release.apk`

## Destek

Sorun yaşarsanız:
- Expo Dokümantasyonu: https://docs.expo.dev/
- React Native Dokümantasyonu: https://reactnative.dev/docs/signed-apk-android
- Google Play Console Yardım: https://support.google.com/googleplay/android-developer

