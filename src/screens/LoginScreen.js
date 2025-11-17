import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  InteractionManager,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase, supabaseUrl, supabaseAnonKey } from '../config/supabase';
import { 
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_USERINFO_URL,
} from '../config/googleAuth';
import { useAppStore } from '../store/appStore';
import { showError, showSuccess, showInfo } from '../utils/toast';

// WebBrowser'ın OAuth sonrası oturumu kapatması için
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;
const isTablet = width >= 1024;

// Responsive değerler
const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const appStore = useAppStore();
  const loadUserProfile = appStore?.loadUserProfile;
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sayfa açılırken loading göster
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('E-posta ve şifre gereklidir.');
      return;
    }

    setIsLoading(true);

    try {
      // Supabase Auth ile giriş yap
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        showError(error.message || 'Giriş yapılırken bir hata oluştu.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Kullanıcı profilini yükle
        let profile = null;
        if (loadUserProfile && typeof loadUserProfile === 'function') {
          profile = await loadUserProfile(data.user.id);
        } else {
          // Fallback: Direkt Supabase'den profil yükle
          console.warn('loadUserProfile fonksiyonu bulunamadı, direkt Supabase\'den yükleniyor');
          const { data: profileData, error: profileError } = await supabase
            .from('kullanici_profilleri')
            .select('*, roller(*)')
            .eq('id', data.user.id)
            .maybeSingle(); // maybeSingle() kullan - profil yoksa null döner, hata vermez
          
          // PGRST116 hatası normal (profil bulunamadı), diğer hataları logla
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profil yükleme hatası:', profileError);
          }
          
          if (profileData) {
            profile = profileData;
            if (appStore?.setUserProfile) {
              appStore.setUserProfile(profileData);
            }
          }
        }
        
        // Aktif kontrolü - Pasif kullanıcılar giriş yapamaz
        if (profile && profile.aktif === false) {
          // Kullanıcıyı çıkış yaptır
          await supabase.auth.signOut();
          showError('Hesabınız pasif durumda. Giriş yapamazsınız. Lütfen yönetici ile iletişime geçin.');
          setIsLoading(false);
          return;
        }
        
        // Navigation'ı hemen yap (kullanıcı deneyimi için önemli)
        // Navigation'ı reset ile yap - stack'i temizle ve yeni ekrana git
        if (profile) {
          // Rol kontrolü - Kasa rolü (id: 3) ise KasaScreen'e yönlendir
          if (profile.rol_id === 3) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'KasaScreen' }],
            });
          } else {
            // Diğer roller için MainTabs'a (HomeScreen) yönlendir
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        } else {
          // Profil yoksa MainTabs'a yönlendir
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
        
        // Toast mesajını göster
        setTimeout(() => {
          showSuccess('Giriş yapıldı', 'Hoş geldiniz!');
        }, 300);
      }
    } catch (error) {
      console.error('Giriş yapılırken hata:', error);
      showError('Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    // Geri gidecek ekran varsa geri git, yoksa hiçbir şey yapma
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);

    try {
      // Google OAuth Web Client ID kontrolü (Android Client ID gerekmez)
      if (!GOOGLE_WEB_CLIENT_ID) {
        showError('Google OAuth yapılandırması eksik. Lütfen Web Client ID\'yi ayarlayın.');
        setIsGoogleLoading(false);
        return;
      }

      // Google Sign-In'i yapılandır
      // Sadece Web Client ID kullanıyoruz (Android Client ID gerekmez)
      // ID token almak için webClientId ve offlineAccess: true gerekli
      // Dokümantasyon: https://github.com/react-native-google-signin/google-signin
      try {
        // Web Client ID kontrolü
        if (!GOOGLE_WEB_CLIENT_ID) {
          throw new Error('Web Client ID eksik');
        }
        
        if (!GOOGLE_WEB_CLIENT_ID.includes('.apps.googleusercontent.com')) {
          throw new Error('Geçersiz Web Client ID formatı. Web Application tipinde olmalı (Android değil!)');
        }
        
        // Web Client ID'nin Android Client ID olmadığından emin ol
        if (GOOGLE_WEB_CLIENT_ID.includes('-android')) {
          console.warn('UYARI: Client ID Android tipinde görünüyor. Web Application Client ID kullanılmalı!');
        }
        
        console.log('Google Sign-In yapılandırılıyor...');
        console.log('Package Name / Application ID: com.kahvedukkani.app');
        console.log('Web Client ID:', GOOGLE_WEB_CLIENT_ID);
        
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID, // Web Application Client ID - ID token almak için gerekli
          offlineAccess: true, // ID token almak için true olmalı
          // Release build için forceCodeForRefreshToken: true eklenebilir
          forceCodeForRefreshToken: false, // ID token için false yeterli
        });
        console.log('✅ Google Sign-In yapılandırıldı');
      } catch (configError) {
        console.error('❌ Google Sign-In yapılandırma hatası:', configError);
        let configErrorMsg = 'Google Sign-In yapılandırma hatası.\n\n';
        if (configError.message?.includes('Client ID')) {
          configErrorMsg += 'Web Client ID geçersiz veya eksik.\n\n';
          configErrorMsg += 'ÖNEMLİ: Web Application Client ID kullanılmalı (Android Client ID değil!)\n\n';
          configErrorMsg += 'Google Cloud Console\'da:\n';
          configErrorMsg += '1. APIs & Services > Credentials\n';
          configErrorMsg += '2. OAuth 2.0 Client ID (Web Application) oluşturun\n';
          configErrorMsg += '3. Package name: com.kahvedukkani.app\n';
          configErrorMsg += '4. SHA-1 fingerprint ekleyin\n\n';
          configErrorMsg += 'Mevcut Client ID: ' + (GOOGLE_WEB_CLIENT_ID || 'Yok');
        } else {
          configErrorMsg += configError.message || 'Bilinmeyen yapılandırma hatası';
        }
        showError(configErrorMsg);
        setIsGoogleLoading(false);
        return;
      }

      // Google Sign-In başlat
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        console.log('Google Play Services mevcut');
      } catch (playServicesError) {
        console.error('Google Play Services hatası:', playServicesError);
        showError('Google Play Services gerekli. Lütfen Google Play Services\'i güncelleyin.');
        setIsGoogleLoading(false);
        return;
      }
      
      console.log('Google Sign-In başlatılıyor...');
      console.log('Web Client ID:', GOOGLE_WEB_CLIENT_ID);
      
      let userInfo;
      try {
        userInfo = await GoogleSignin.signIn();
      } catch (signInError) {
        console.error('Google Sign-In hatası:', signInError);
        // Kullanıcı iptal ettiyse hata gösterme
        if (signInError.code === 'SIGN_IN_CANCELLED') {
          console.log('Google Sign-In kullanıcı tarafından iptal edildi');
          setIsGoogleLoading(false);
          return;
        }
        // Diğer hatalar için mesaj göster
        let errorMessage = 'Google ile giriş yapılırken bir hata oluştu.';
        if (signInError.message) {
          errorMessage = signInError.message;
        } else if (signInError.code) {
          errorMessage = `Google Sign-In hatası: ${signInError.code}`;
        }
        showError(errorMessage);
        setIsGoogleLoading(false);
        return;
      }
      
      console.log('Google Sign-In başarılı (tam obje):', JSON.stringify(userInfo, null, 2));

      // Farklı olası veri yapılarını kontrol et
      let googleUser = null;
      if (userInfo.data?.user) {
        googleUser = userInfo.data.user;
      } else if (userInfo.user) {
        googleUser = userInfo.user;
      } else if (userInfo.data) {
        googleUser = userInfo.data;
      } else {
        googleUser = userInfo;
      }

      if (!googleUser) {
        console.error('Google kullanıcı bilgileri bulunamadı. userInfo:', JSON.stringify(userInfo, null, 2));
        showError('Google giriş bilgileri alınamadı. Lütfen tekrar deneyin.');
        setIsGoogleLoading(false);
        return;
      }
      
      // Debug: Tüm Google kullanıcı bilgilerini logla
      console.log('Google kullanıcı bilgileri (tam obje):', JSON.stringify(googleUser, null, 2));
      console.log('Google userInfo.data:', JSON.stringify(userInfo.data, null, 2));
      
      const googleId = googleUser.id;
      const email = googleUser.email;
      // İlk değerleri al (ID token decode sonrası güncellenebilir)
      let name = googleUser.name;
      let givenName = googleUser.givenName || googleUser.given_name || googleUser.firstName || googleUser.first_name;
      let familyName = googleUser.familyName || googleUser.family_name || googleUser.lastName || googleUser.last_name;
      const picture = googleUser.photo || googleUser.picture || googleUser.photoURL;
      
      // Google ID token'ını al (Supabase Google Provider için gerekli)
      // getTokens() metodu ile ID token'ı al
      let idToken = null;
      try {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
        console.log('Google ID token alındı:', idToken ? 'Mevcut' : 'Yok');
        
        // ID token'dan kullanıcı bilgilerini çıkar (JWT decode)
        if (idToken) {
          try {
            const tokenParts = idToken.split('.');
            if (tokenParts.length === 3) {
              // JWT payload'ı decode et (base64url decode)
              const payload = tokenParts[1];
              const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
              const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
              
              // React Native uyumlu base64 decode
              let decoded = null;
              if (typeof atob !== 'undefined') {
                decoded = atob(padded);
              } else if (typeof Buffer !== 'undefined') {
                decoded = Buffer.from(padded, 'base64').toString('utf-8');
              } else {
                // Fallback: Manuel decode (basit base64)
                try {
                  decoded = decodeURIComponent(escape(atob ? atob(padded) : ''));
                } catch (e) {
                  console.warn('Base64 decode başarısız:', e);
                }
              }
              
              if (!decoded) {
                throw new Error('Base64 decode başarısız');
              }
              
              const tokenData = JSON.parse(decoded);
              console.log('ID token payload:', tokenData);
              
              // Token'dan isim bilgilerini al (eğer userInfo'da yoksa)
              if (!name && !givenName && tokenData.name) {
                console.log('İsim bilgisi ID token\'dan alınıyor:', tokenData.name);
                // name değişkenini güncelle (sonraki parse işleminde kullanılacak)
                googleUser.name = tokenData.name || googleUser.name;
              }
              if (!givenName && tokenData.given_name) {
                googleUser.givenName = tokenData.given_name;
              }
              if (!familyName && tokenData.family_name) {
                googleUser.familyName = tokenData.family_name;
              }
            }
          } catch (decodeError) {
            console.warn('ID token decode edilemedi:', decodeError);
          }
        }
      } catch (tokenError) {
        console.error('Google ID token alınamadı:', tokenError);
        // Alternatif: userInfo'dan direkt almayı dene
        idToken = userInfo.data?.idToken || userInfo.idToken;
      }
      
      // Eğer hala token yoksa, userInfo'dan direkt almayı dene
      if (!idToken) {
        idToken = userInfo.data?.idToken || userInfo.idToken || userInfo.data?.id_token;
      }
      
      // ID token decode sonrası güncellenmiş değerleri al
      name = googleUser.name || name;
      givenName = googleUser.givenName || googleUser.given_name || googleUser.firstName || googleUser.first_name || givenName;
      familyName = googleUser.familyName || googleUser.family_name || googleUser.lastName || googleUser.last_name || familyName;
      
      // ID token zorunlu - Supabase Google Provider için gerekli
      if (!idToken) {
        console.error('Google ID token bulunamadı. userInfo:', JSON.stringify(userInfo, null, 2));
        showError('Google ID token alınamadı. Lütfen tekrar deneyin.');
        setIsGoogleLoading(false);
        return;
      }
      
      // Kullanıcı bilgilerini parse et - İLK DEĞERLER (Supabase auth'dan sonra güncellenecek)
      // Bu değerler sadece fallback için, asıl parse Supabase auth'dan sonra yapılacak
      let ad = '';
      let soyad = '';
      
      console.log('Parse öncesi değerler (geçici):', { 
        name, 
        givenName, 
        familyName, 
        email,
        'googleUser keys': Object.keys(googleUser)
      });

        // Supabase'de kullanıcı profilini kontrol et veya oluştur
        let profile = null;
        let userId = null;
        let isNewUser = false;

        try {
          // Supabase'in Google Provider'ını kullanarak ID token ile giriş yap
          // signInWithIdToken hem yeni hem de mevcut kullanıcılar için otomatik olarak çalışır
          // Yeni kullanıcılar otomatik olarak oluşturulur, mevcut kullanıcılar direkt giriş yapar
          console.log('Supabase Google Provider ile giriş yapılıyor...');
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (authError) {
            console.error('Supabase Google Provider giriş hatası:', authError);
            
            // Hata mesajlarını kullanıcı dostu hale getir
            let errorMessage = 'Google ile giriş yapılırken bir hata oluştu.';
            if (authError.message.includes('Invalid token')) {
              errorMessage = 'Google token geçersiz. Lütfen tekrar deneyin.';
            } else if (authError.message.includes('Token expired')) {
              errorMessage = 'Google token süresi dolmuş. Lütfen tekrar deneyin.';
            } else {
              errorMessage = authError.message || errorMessage;
            }
            
            showError(errorMessage);
            setIsGoogleLoading(false);
            return;
          }

          if (!authData?.user) {
            showError('Giriş yapılamadı. Lütfen tekrar deneyin.');
            setIsGoogleLoading(false);
            return;
          }

          userId = authData.user.id;
          
          // Yeni kullanıcı kontrolü: user_metadata'da google_id yoksa veya profil yoksa yeni kullanıcı olabilir
          // Ama signInWithIdToken otomatik olarak yeni kullanıcı oluşturur, bu yüzden kontrol etmeye gerek yok
          isNewUser = !authData.user.user_metadata?.google_id;
          
          // Supabase auth'dan gelen user metadata'sını kontrol et
          // Supabase Google Provider bazen bilgileri user_metadata'ya koyar
          const supabaseUserMetadata = authData.user.user_metadata || {};
          const supabaseFullName = supabaseUserMetadata.full_name || supabaseUserMetadata.name;
          const supabaseAvatarUrl = supabaseUserMetadata.avatar_url || supabaseUserMetadata.picture;
          
          // Display Name'i belirle (öncelik sırası: Supabase full_name > Google name > Parse edilmiş ad soyad)
          const displayName = supabaseFullName || name || `${ad} ${soyad}`.trim() || email?.split('@')[0] || 'Kullanıcı';
          
          console.log('═══════════════════════════════════════════════════════════');
          console.log('🔐 GOOGLE AUTH GİRİŞ BAŞARILI');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('👤 KULLANICI BİLGİLERİ:');
          console.log('   📛 Display Name:', displayName);
          console.log('   📧 Email:', authData.user.email);
          console.log('   🆔 User ID:', userId);
          console.log('   🆕 Yeni Kullanıcı:', isNewUser ? 'Evet' : 'Hayır');
          console.log('');
          console.log('📋 DETAYLI BİLGİLER:');
          console.log('   • Google Name:', name || '(yok)');
          console.log('   • Supabase Full Name:', supabaseFullName || '(yok)');
          console.log('   • Parse Edilmiş Ad:', ad || '(yok)');
          console.log('   • Parse Edilmiş Soyad:', soyad || '(yok)');
          console.log('   • Given Name:', givenName || '(yok)');
          console.log('   • Family Name:', familyName || '(yok)');
          console.log('   • User Metadata:', JSON.stringify(supabaseUserMetadata, null, 2));
          console.log('═══════════════════════════════════════════════════════════');
          
          console.log('Google ile giriş başarılı:', {
            userId,
            email: authData.user.email,
            isNewUser,
            displayName,
            user_metadata: supabaseUserMetadata,
            supabaseFullName,
          });
          
          // AD/SOYAD PARSE İŞLEMİ - Supabase auth'dan sonra (en güvenilir kaynak)
          // Öncelik sırası: Supabase full_name > Google givenName/familyName > Google name > Email
          
          if (supabaseFullName && supabaseFullName.trim()) {
            // 1. ÖNCELİK: Supabase'den gelen full_name (en güvenilir)
            console.log('✅ [1] Ad/soyad Supabase metadata\'sından alınıyor:', supabaseFullName);
            const nameParts = supabaseFullName.trim().split(/\s+/).filter(part => part.length > 0);
            if (nameParts.length > 0) {
              ad = nameParts[0];
              if (nameParts.length > 1) {
                soyad = nameParts.slice(1).join(' ');
              } else {
                soyad = '';
              }
              console.log('✅ Parse edildi - Ad:', ad, 'Soyad:', soyad);
            }
          } else if (givenName && givenName.trim()) {
            // 2. FALLBACK: Google givenName/familyName
            console.log('✅ [2] Ad/soyad Google givenName/familyName\'den alınıyor');
            ad = givenName.trim();
            if (familyName && familyName.trim()) {
              soyad = familyName.trim();
            } else {
              soyad = '';
            }
            console.log('✅ Parse edildi - Ad:', ad, 'Soyad:', soyad);
          } else if (name && name.trim()) {
            // 3. FALLBACK: Google name
            console.log('✅ [3] Ad/soyad Google name\'den parse ediliyor:', name);
            const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0);
            if (nameParts.length > 0) {
              ad = nameParts[0];
              if (nameParts.length > 1) {
                soyad = nameParts.slice(1).join(' ');
              } else {
                soyad = '';
              }
              console.log('✅ Parse edildi - Ad:', ad, 'Soyad:', soyad);
            }
          } else {
            // 4. SON FALLBACK: Email'den çıkar
            console.warn('⚠️ [4] Ad/soyad email\'den çıkarılıyor');
            if (email) {
              const emailParts = email.split('@')[0].split(/[._-]/);
              ad = emailParts[0] || 'Kullanıcı';
              soyad = emailParts.slice(1).join(' ') || '';
            } else {
              ad = 'Kullanıcı';
              soyad = '';
            }
            console.log('✅ Parse edildi - Ad:', ad, 'Soyad:', soyad);
          }
          
          // Final kontrol: Eğer hala ad boş veya "Kullanıcı" ise
          if (!ad || ad.trim() === '' || ad === 'Kullanıcı') {
            console.error('❌ HATA: Ad hala boş veya "Kullanıcı"! Tüm kaynaklar tüketildi.');
            ad = 'Kullanıcı';
            soyad = '';
          }
          
          console.log('📝 ========== FINAL AD/SOYAD DEĞERLERİ ==========');
          console.log('📝 Ad:', ad);
          console.log('📝 Soyad:', soyad);
          console.log('📝 Display Name:', displayName);
          console.log('📝 ================================================');

          // Profil kontrolü
                const { data: existingProfile, error: checkError } = await supabase
                  .from('kullanici_profilleri')
            .select('*, roller(*)')
            .eq('id', userId)
            .maybeSingle();

                if (checkError && checkError.code !== 'PGRST116') {
                  console.error('Profil kontrolü hatası:', checkError);
                }

                if (existingProfile) {
            profile = existingProfile;
            console.log('✅ Mevcut profil bulundu:', existingProfile);
            
            // Mevcut profilde ad/soyad yanlışsa (Kullanıcı veya boş) güncelle
            const needsUpdate = 
              (existingProfile.ad === 'Kullanıcı' || !existingProfile.ad || existingProfile.ad.trim() === '') ||
              (!existingProfile.soyad || existingProfile.soyad.trim() === '');
            
            if (needsUpdate && (ad && ad.trim() && ad !== 'Kullanıcı')) {
              console.log('⚠️ Mevcut profilde ad/soyad yanlış, güncelleniyor...');
              console.log('📝 Eski değerler:', { ad: existingProfile.ad, soyad: existingProfile.soyad });
              console.log('📝 Yeni değerler:', { ad: ad, soyad: soyad });
              
              setIsCreatingProfile(true);
              
              const { data: updatedProfile, error: updateError } = await supabase
                .from('kullanici_profilleri')
                .update({
                  ad: ad,
                  soyad: soyad,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('*, roller(*)')
                .single();
              
              setIsCreatingProfile(false);
              
              if (updateError) {
                console.error('❌ Profil güncelleme hatası:', updateError);
                showError('Profil güncellenirken bir hata oluştu.');
              } else if (updatedProfile) {
                console.log('✅ Profil başarıyla güncellendi!');
                console.log('✅ Güncellenen profil:', {
                  id: updatedProfile.id,
                  ad: updatedProfile.ad,
                  soyad: updatedProfile.soyad,
                });
                profile = updatedProfile;
              }
            }
                } else {
                  // Profil yoksa oluştur - İLK KEZ GİRİŞ YAPILIYOR
                  setIsCreatingProfile(true);
                  
                  console.log('');
                  console.log('📝 ========== PROFİL OLUŞTURMA ==========');
                  console.log('📝 Yeni profil oluşturuluyor...');
                  console.log('📝 Profil verileri (INSERT öncesi):', { 
                    id: userId, 
                    ad: ad, 
                    soyad: soyad, 
                    rol_id: 2, 
                    aktif: true 
                  });
                  console.log('📝 Ad değeri:', JSON.stringify(ad));
                  console.log('📝 Soyad değeri:', JSON.stringify(soyad));
                  
                  // Supabase'den gelen full_name'i kullanarak insert yap
                  // Eğer ad/soyad hala boşsa, Supabase full_name'den tekrar parse et
                  if ((!ad || ad.trim() === '' || ad === 'Kullanıcı') && supabaseFullName) {
                    console.log('⚠️ Ad/soyad boş, Supabase full_name\'den tekrar parse ediliyor:', supabaseFullName);
                    const nameParts = supabaseFullName.trim().split(/\s+/).filter(part => part.length > 0);
                    if (nameParts.length > 0) {
                      ad = nameParts[0];
                      if (nameParts.length > 1) {
                        soyad = nameParts.slice(1).join(' ');
                      } else {
                        soyad = '';
                      }
                      console.log('✅ Tekrar parse edildi - Ad:', ad, 'Soyad:', soyad);
                    }
                  }
                  
            const { data: newProfile, error: insertError } = await supabase
                    .from('kullanici_profilleri')
                    .insert({
                id: userId,
                      ad: ad,
                      soyad: soyad,
                      telefon: null,
                rol_id: 2,
                      aktif: true,
              })
                      .select('*, roller(*)')
                      .single();
                      
                  setIsCreatingProfile(false);
                      
                  if (newProfile) {
                    console.log('✅ Profil başarıyla oluşturuldu!');
                    console.log('✅ Oluşturulan profil:', {
                      id: newProfile.id,
                      ad: newProfile.ad,
                      soyad: newProfile.soyad,
                      rol_id: newProfile.rol_id,
                      aktif: newProfile.aktif
                    });
                    console.log('📝 ========================================');
                    console.log('');
                  } else if (insertError) {
                    console.error('❌ Profil oluşturma hatası:', insertError);
                    console.log('📝 ========================================');
                    console.log('');
                  }

            if (insertError) {
              console.error('Profil oluşturma hatası:', insertError);
              setIsCreatingProfile(false);
              showError('Profil oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
              setIsGoogleLoading(false);
              return;
            }

            profile = newProfile;
          }

          // Aktif kontrolü
              if (profile && profile.aktif === false) {
                await supabase.auth.signOut();
                showError('Hesabınız pasif durumda. Giriş yapamazsınız. Lütfen yönetici ile iletişime geçin.');
                setIsGoogleLoading(false);
                return;
              }
              
          // appStore'da state'leri güncelle
          if (appStore?.setUser && profile) {
            appStore.setUser({
              id: userId,
              email: email,
              user_metadata: {
                full_name: name,
                avatar_url: picture,
              },
            });
          }

          if (appStore?.setUserProfile && profile) {
            appStore.setUserProfile(profile);
          }

          // Profili tekrar yükle (roller ile birlikte)
          if (loadUserProfile && typeof loadUserProfile === 'function') {
            try {
              const fullProfile = await loadUserProfile(userId);
              if (fullProfile) {
                profile = fullProfile;
              }
            } catch (loadError) {
              console.error('Profil yükleme hatası:', loadError);
            }
          }
              
              // Loading state'i kapat
              setIsGoogleLoading(false);
              
          // Navigation'ı yap
              const targetRoute = profile?.rol_id === 3 ? 'KasaScreen' : 'MainTabs';
              
              console.log('Google OAuth başarılı, yönlendiriliyor:', targetRoute, 'Profil:', profile?.rol_id);
              
              navigation.reset({
                index: 0,
                routes: [{ name: targetRoute }],
              });
              
              setTimeout(() => {
                showSuccess('Giriş yapıldı', 'Hoş geldiniz!');
              }, 300);
            } catch (profileError) {
              console.error('Profil işleme hatası:', profileError);
              setIsGoogleLoading(false);
          showError('Profil oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Google ile giriş yapılırken hata:', error);
      console.error('Hata detayları:', JSON.stringify(error, null, 2));
      
      // Google Sign-In hata kodları
      if (error.code === 'SIGN_IN_CANCELLED') {
        showInfo('Google ile giriş iptal edildi.');
      } else if (error.code === 'IN_PROGRESS') {
        showInfo('Google ile giriş zaten devam ediyor.');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        showError('Google Play Services mevcut değil. Lütfen Google Play Services\'i yükleyin.');
      } else if (error.code === 'DEVELOPER_ERROR' || error.code === 10 || error.message?.includes('DEVELOPER_ERROR') || error.message?.includes('10:') || error.message?.includes('troubleshooting')) {
        // DEVELOPER_ERROR genellikle Google Cloud Console yapılandırmasından kaynaklanır
        // Error code 10 = DEVELOPER_ERROR
        console.error('DEVELOPER_ERROR - Google Cloud Console yapılandırmasını kontrol edin:');
        console.error('Hata kodu:', error.code);
        console.error('Hata mesajı:', error.message);
        console.error('Web Client ID:', GOOGLE_WEB_CLIENT_ID);
        console.error('\nKontrol edilmesi gerekenler:');
        console.error('1. Google Cloud Console > APIs & Services > Credentials');
        console.error('2. OAuth 2.0 Client ID (Web Application) mevcut mu?');
        console.error('3. SHA-1 fingerprint eklenmiş mi? (Hem debug hem release için)');
        console.error('Debug SHA-1: keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android');
        console.error('Release SHA-1: 2B:AE:3E:2C:FF:EF:F8:2B:81:73:EF:71:31:A2:9A:F0:1C:41:60:A3');
        console.error('4. OAuth consent screen yapılandırılmış mı?');
        console.error('5. Authorized redirect URIs\'e Supabase callback URL eklenmiş mi?');
        console.error('6. Web Client ID doğru mu? (Web Application tipinde olmalı)');
        
        let errorMsg = '🔴 DEVELOPER_ERROR - Google OAuth Yapılandırma Hatası\n\n';
        errorMsg += 'Bu hata Google Cloud Console yapılandırmasından kaynaklanır.\n\n';
        errorMsg += '📋 ÖNEMLİ KONTROLLER:\n';
        errorMsg += '✓ Package Name: com.kahvedukkani.app\n';
        errorMsg += '✓ Application ID: com.kahvedukkani.app\n';
        errorMsg += '✓ Web Client ID tipinde olmalı (Android Client ID değil!)\n';
        errorMsg += '✓ Mevcut Client ID: ' + GOOGLE_WEB_CLIENT_ID + '\n\n';
        errorMsg += '🔧 ÇÖZÜM ADIMLARI:\n';
        errorMsg += '1. Google Cloud Console > APIs & Services > Credentials\n';
        errorMsg += '2. OAuth 2.0 Client ID (Web Application) oluşturun/kontrol edin\n';
        errorMsg += '   ⚠️ ÖNEMLİ: Android Client ID değil, Web Application olmalı!\n';
        errorMsg += '3. Package name ekleyin: com.kahvedukkani.app\n';
        errorMsg += '4. SHA-1 fingerprint ekleyin (HER İKİSİ DE GEREKLİ!):\n';
        errorMsg += '   📱 Debug (Emülatör için): 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n';
        errorMsg += '   📦 Release (APK için): 2B:AE:3E:2C:FF:EF:F8:2B:81:73:EF:71:31:A2:9A:F0:1C:41:60:A3\n';
        errorMsg += '   ⚠️ ÖNEMLİ: Her iki SHA-1\'i de Google Cloud Console\'a eklemelisiniz!\n';
        errorMsg += '5. OAuth consent screen yapılandırın\n';
        errorMsg += '6. Authorized redirect URIs:\n';
        errorMsg += '   https://hgxicutwejvfysjsmjcw.supabase.co/auth/v1/callback\n\n';
        errorMsg += '📚 Detaylı dokümantasyon:\n';
        errorMsg += 'https://react-native-google-signin.github.io/docs/troubleshooting\n\n';
        errorMsg += '💡 Configuration Doctor çalıştırın:\n';
        errorMsg += 'npx @react-native-google-signin/config-doctor';
        
        showError(errorMsg);
      } else {
        showError('Google ile giriş yapılırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      }
      
      setIsGoogleLoading(false);
    }
  };

  const handleSignUpPress = () => {
    navigation.navigate('SignUpScreen');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={[
          styles.header,
          { paddingTop: getResponsiveValue(16, 18, 20, 22) + insets.top }
        ]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giriş</Text>
          <View style={styles.placeholder} />
        </View>

        {isPageLoading ? (
          // Loading Spinner
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="large" 
              color="#8B4513" 
            />
            <Text style={[
              styles.loadingText,
              { fontSize: getResponsiveValue(16, 17, 18, 20) }
            ]}>
              Yükleniyor...
            </Text>
          </View>
        ) : (
          /* Giriş Formu */
          <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo ve Başlık */}
          <View style={styles.logoContainer}>
            <Ionicons 
              name="cafe" 
              size={getResponsiveValue(50, 56, 62, 68)} 
              color="#8B4513"
              style={styles.logoIcon}
            />
            <Text style={[
              styles.logoText,
              { fontSize: getResponsiveValue(24, 26, 28, 30) }
            ]}>
              Sipariş Sistemi
            </Text>
            <Text style={[
              styles.logoSubtext,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Sipariş yönetimi için giriş yapın
            </Text>
          </View>

          <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              E-posta
            </Text>
            <View style={[
              styles.inputWrapper,
              {
                paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                paddingVertical: getResponsiveValue(12, 14, 16, 18),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="E-posta adresinizi girin"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Şifre
            </Text>
            <View style={[
              styles.inputWrapper,
              {
                paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                paddingVertical: getResponsiveValue(12, 14, 16, 18),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="#8B4513" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              {
                paddingVertical: getResponsiveValue(16, 18, 20, 22),
                paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
                marginTop: getResponsiveValue(24, 28, 32, 36),
              }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View style={styles.loginButtonContent}>
                <Ionicons 
                  name="log-in" 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="white" 
                />
                <Text style={[
                  styles.loginButtonText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Giriş Yap
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Ayırıcı */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={[
              styles.dividerText,
              { fontSize: getResponsiveValue(12, 13, 14, 16) }
            ]}>
              veya
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Auth Butonu */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                paddingVertical: getResponsiveValue(16, 18, 20, 22),
                paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
                marginTop: getResponsiveValue(16, 18, 20, 22),
              }
            ]}
            onPress={handleGoogleAuth}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
            <View style={styles.googleButtonContent}>
              <Ionicons 
                name="logo-google" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#4285F4" 
              />
              <Text style={[
                styles.googleButtonText,
                { fontSize: getResponsiveValue(16, 17, 18, 20) }
              ]}>
                Google ile Giriş Yap
              </Text>
            </View>
            )}
          </TouchableOpacity>

          {/* Kayıt Ol Linki */}
          <View style={styles.signUpLinkContainer}>
            <Text style={[
              styles.signUpLinkText,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Hesabınız yok mu?{' '}
            </Text>
            <TouchableOpacity onPress={handleSignUpPress}>
              <Text style={[
                styles.signUpLinkButton,
                { fontSize: getResponsiveValue(14, 15, 16, 18) }
              ]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
      
      {/* Profil Oluşturma Loading Modal */}
      <Modal
        visible={isCreatingProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.profileLoadingOverlay}>
          <View style={styles.profileLoadingContainer}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={styles.profileLoadingText}>
              Profiliniz oluşturuluyor...
            </Text>
            <Text style={styles.profileLoadingSubtext}>
              Lütfen bekleyin
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: getResponsiveValue(40, 48, 56, 64),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingBottom: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: getResponsiveValue(40, 44, 48, 52),
    height: getResponsiveValue(40, 44, 48, 52),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  placeholder: {
    width: getResponsiveValue(40, 44, 48, 52),
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: getResponsiveValue(40, 50, 60, 70),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(20, 24, 28, 32),
  },
  logoIcon: {
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  logoText: {
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  logoSubtext: {
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  formContainer: {
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  inputContainer: {
    marginBottom: getResponsiveValue(20, 24, 28, 32),
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  textInput: {
    flex: 1,
    color: '#1F2937',
    fontFamily: 'System',
    padding: 0,
  },
  passwordToggle: {
    padding: getResponsiveValue(4, 5, 6, 8),
    marginLeft: getResponsiveValue(8, 10, 12, 14),
  },
  loginButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
  },
  demoInfo: {
    alignItems: 'center',
    marginTop: getResponsiveValue(20, 24, 28, 32),
    padding: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  demoText: {
    color: '#8B4513',
    fontWeight: '500',
    fontFamily: 'System',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: getResponsiveValue(20, 24, 28, 32),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: getResponsiveValue(12, 14, 16, 18),
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  googleButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  googleButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontFamily: 'System',
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveValue(20, 24, 28, 32),
  },
  signUpLinkText: {
    color: '#6B7280',
    fontFamily: 'System',
  },
  signUpLinkButton: {
    color: '#8B4513',
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(60, 80, 100, 120),
  },
  loadingText: {
    marginTop: getResponsiveValue(16, 18, 20, 22),
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  profileLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileLoadingContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(32, 36, 40, 44),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: getResponsiveValue(250, 280, 300, 320),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileLoadingText: {
    marginTop: getResponsiveValue(20, 22, 24, 26),
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
    textAlign: 'center',
  },
  profileLoadingSubtext: {
    marginTop: getResponsiveValue(8, 10, 12, 14),
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'System',
    textAlign: 'center',
  },
});
