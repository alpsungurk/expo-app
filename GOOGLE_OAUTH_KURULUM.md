# Google OAuth Kurulum Kılavuzu

Bu kılavuz, Expo React Native uygulamanızda Google OAuth ile giriş yapabilmek için gerekli adımları açıklar.

## 📋 Gereksinimler

- Google Cloud Console hesabı
- Supabase projesi
- Expo uygulaması (bu proje)

---

## 1️⃣ Google Cloud Console Ayarları

### Adım 1: OAuth 2.0 Credentials Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** sayfasına gidin
2. **+ CREATE CREDENTIALS** → **OAuth client ID** seçin
3. Eğer OAuth consent screen yapılandırılmamışsa, önce onu yapılandırmanız istenecek:
   - **User Type**: External (genel kullanım için) veya Internal (sadece kuruluş içi)
   - **App name**: Uygulamanızın adı (örn: "Kahve Dükkanı Sipariş Sistemi")
   - **User support email**: Destek e-postanız
   - **Developer contact information**: Geliştirici iletişim bilgileri
   - **Scopes**: `email`, `profile`, `openid` (varsayılan olarak eklenir)
   - **Test users**: Test aşamasında kullanılacak e-postalar (isteğe bağlı)

### Adım 2: OAuth Client ID Oluşturma

1. **Application type**: **Android** seçin
2. **Name**: Uygulamanızın adı (örn: "Kahve Dükkanı Android")
3. **Package name**: `com.kahvedukkani.app` (app.config.js'deki package ile aynı olmalı)
4. **SHA-1 certificate fingerprint**: 
   - Debug için: `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - Release için: Release keystore'unuzun SHA-1'i
5. **CREATE** butonuna tıklayın

### Adım 3: Web Application OAuth Client ID Oluşturma

1. Yine **+ CREATE CREDENTIALS** → **OAuth client ID**
2. **Application type**: **Web application** seçin
3. **Name**: "Kahve Dükkanı Web" gibi bir isim
4. **Authorized redirect URIs** kısmına **SADECE** şunu ekleyin:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   - `<your-project-ref>` yerine Supabase proje referansınızı yazın
   - Örnek: `https://hgxicutwejvfysjsmjcw.supabase.co/auth/v1/callback`
   - ⚠️ **ÖNEMLİ**: Expo redirect URI'lerini (exp:// veya com.kahvedukkani.app://) buraya EKLEMEYİN
   - Google'a sadece Supabase callback URL'i gönderilir, Expo redirect URI'si Supabase tarafından handle edilir
5. **CREATE** butonuna tıklayın

### Adım 4: Client ID ve Secret'ı Kopyalama

- **Android Client ID**: Android uygulaması için (şimdilik gerekli değil, gelecekte kullanılabilir)
- **Web Client ID**: Supabase'de kullanılacak
- **Web Client Secret**: Supabase'de kullanılacak

⚠️ **ÖNEMLİ**: Client Secret'ı güvenli tutun, asla public repository'lere commit etmeyin!

---

## 2️⃣ Supabase Dashboard Ayarları

### Adım 1: Google Provider'ı Etkinleştirme

1. [Supabase Dashboard](https://app.supabase.com/) → Projenize gidin
2. **Authentication** → **Providers** → **Google** sekmesine gidin
3. **Enable Google provider** toggle'ını açın
4. **Client ID (for OAuth)**: Web Application Client ID'yi yapıştırın
5. **Client Secret (for OAuth)**: Web Application Client Secret'ı yapıştırın
6. **SAVE** butonuna tıklayın

### Adım 2: Redirect URL'leri Kontrol Etme

1. **Authentication** → **URL Configuration** sayfasına gidin
2. **Redirect URLs** kısmında şu URL'lerin olduğundan emin olun:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (otomatik eklenir)
   - Expo Go için: `exp://localhost:8081` (development için)
   - Standalone app için: `com.kahvedukkani.app://` (app.config.js'deki scheme)

---

## 3️⃣ Android Uygulama Yapılandırması

### ✅ Zaten Yapılandırılmış

Aşağıdaki yapılandırmalar zaten mevcut:

1. **app.config.js**: `scheme: 'com.kahvedukkani.app'` eklendi
2. **AndroidManifest.xml**: Deep linking intent filter yapılandırıldı
3. **LoginScreen.js**: Google OAuth implementasyonu tamamlandı

### Test için SHA-1 Fingerprint Alma

Debug build için SHA-1 fingerprint'i almak için:

```bash
# Windows (PowerShell)
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Çıktıda **SHA1** değerini bulun ve Google Cloud Console'daki Android OAuth client ID'ye ekleyin.

---

## 4️⃣ Test Etme

### Adım 1: Uygulamayı Başlatma

```bash
# Expo Go ile test (development)
npm start

# Veya Android build ile test
npm run android
```

### Adım 2: Google ile Giriş Yapma

1. Uygulamayı açın
2. Login ekranına gidin
3. **"Google ile Giriş Yap"** butonuna tıklayın
4. Google hesabınızı seçin ve izin verin
5. Başarılı giriş sonrası ana ekrana yönlendirilmelisiniz

### Olası Hatalar ve Çözümleri

#### ❌ "redirect_uri_mismatch" Hatası

**Çözüm**: 
- Google Cloud Console'da Web Application OAuth Client ID'nin **Authorized redirect URIs** kısmına **SADECE** Supabase callback URL'ini ekleyin
- URL tam olarak şu formatta olmalı: `https://<project-ref>.supabase.co/auth/v1/callback`
- ⚠️ **ÖNEMLİ**: Expo'nun redirect URI'sini (exp:// veya com.kahvedukkani.app://) Google Cloud Console'a EKLEMEYİN
- Supabase OAuth flow'u şöyle çalışır:
  1. Uygulama → Supabase'e Expo redirect URI'sini gönderir
  2. Supabase → Google'a kendi callback URL'ini gönderir
  3. Google → Supabase callback URL'ine yönlendirir
  4. Supabase → Token'ları alır ve Expo redirect URI'sine yönlendirir
- Yani Google'a sadece Supabase callback URL'i gönderilir, Expo redirect URI'si değil

#### ❌ "invalid_client" Hatası

**Çözüm**:
- Supabase Dashboard'da Google provider ayarlarında Client ID ve Secret'ın doğru olduğundan emin olun
- Boşluk veya fazladan karakter olmamalı

#### ❌ "access_denied" Hatası

**Çözüm**:
- OAuth consent screen'in yayınlanmış olduğundan emin olun (test modunda olabilir)
- Test kullanıcıları eklediyseniz, giriş yapan e-postanın test kullanıcılar listesinde olduğundan emin olun

#### ❌ Token'lar alınamıyor

**Çözüm**:
- Console loglarını kontrol edin (`console.log('Callback URL:', callbackUrl)`)
- Supabase Dashboard → Authentication → Logs sayfasından hataları kontrol edin

---

## 5️⃣ Production için Önemli Notlar

### Release Build için

1. **Release keystore SHA-1**: Production build için release keystore'unuzun SHA-1 fingerprint'ini Google Cloud Console'a ekleyin
2. **OAuth Consent Screen**: Production'da kullanıcılar için OAuth consent screen'in yayınlanmış olması gerekir
3. **Client Secret**: Production ortamında environment variable olarak saklayın

### Güvenlik

- ✅ Client Secret'ı asla client-side kodda kullanmayın (zaten Supabase'de saklanıyor)
- ✅ Supabase RLS (Row Level Security) politikalarınızın doğru yapılandırıldığından emin olun
- ✅ Kullanıcı profil oluşturma işlemini kontrol edin (Google ile ilk giriş yapan kullanıcılar için)

---

## 6️⃣ iOS için (Gelecek)

iOS için Google OAuth eklemek için:

1. Google Cloud Console'da iOS OAuth Client ID oluşturun
2. `app.config.js`'e iOS bundle identifier ekleyin
3. iOS için de benzer yapılandırma yapın

---

## 📚 Ek Kaynaklar

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## ✅ Kontrol Listesi

- [ ] Google Cloud Console'da OAuth consent screen yapılandırıldı
- [ ] Web Application OAuth Client ID oluşturuldu
- [ ] Authorized redirect URI eklendi: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Supabase Dashboard'da Google provider etkinleştirildi
- [ ] Client ID ve Secret Supabase'e eklendi
- [ ] Android SHA-1 fingerprint Google Cloud Console'a eklendi (debug için)
- [ ] Uygulama test edildi ve Google ile giriş çalışıyor

---

**Sorun mu yaşıyorsunuz?** Console loglarını ve Supabase Authentication logs'unu kontrol edin.

