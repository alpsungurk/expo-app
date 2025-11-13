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
  InteractionManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../config/supabase';
import { 
  GOOGLE_CLIENT_ID, 
  GOOGLE_AUTH_URL, 
  GOOGLE_TOKEN_URL,
  GOOGLE_REVOKE_URL,
  GOOGLE_USERINFO_URL,
  GOOGLE_SCOPES,
  GOOGLE_REDIRECT_PATH 
} from '../config/constants';
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
            .single();
          
          if (!profileError && profileData) {
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
      // Google OAuth Client ID kontrolü
      if (!GOOGLE_CLIENT_ID) {
        showError('Google OAuth yapılandırması eksik. Lütfen Google Client ID\'yi ayarlayın.');
        setIsGoogleLoading(false);
        return;
      }

      // Redirect URI oluştur - useProxy: true kullan
      // Expo proxy URL'ini manuel oluştur (app.config.js'deki scheme'i override etmek için)
      let redirectUrl = AuthSession.makeRedirectUri({
        path: GOOGLE_REDIRECT_PATH,
        useProxy: true, // Expo proxy sunucusunu kullan
        native: false, // Native scheme'i kullanma
      });
      
      // Eğer hala custom scheme kullanıyorsa, manuel olarak Expo proxy URL'ini oluştur
      if (redirectUrl.startsWith('com.kahvedukkani.app://') || redirectUrl.startsWith('exp://')) {
        // Expo proxy URL formatı: https://auth.expo.io/@username/slug
        redirectUrl = `https://auth.expo.io/@alpsungurk/expo-app`;
        console.log('⚠️ Custom scheme tespit edildi, Expo proxy URL kullanılıyor:', redirectUrl);
      }

      console.log('🔗 Redirect URL:', redirectUrl);
      console.log('📋 Bu URL\'yi Google Cloud Console\'a ekleyin!');
      console.log('🔑 Client ID:', GOOGLE_CLIENT_ID);
      console.log('📝 Redirect Path:', GOOGLE_REDIRECT_PATH);
      console.log('🌐 Auth URL:', GOOGLE_AUTH_URL);
      
      // Redirect URL'i sakla (token exchange'de aynı URL'i kullanmak için)
      const savedRedirectUrl = redirectUrl;

      // Google OAuth discovery document
      const discovery = {
        authorizationEndpoint: GOOGLE_AUTH_URL,
        tokenEndpoint: GOOGLE_TOKEN_URL,
        revocationEndpoint: GOOGLE_REVOKE_URL,
      };

      // OAuth request oluştur
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: GOOGLE_SCOPES,
        responseType: AuthSession.ResponseType.Code,
        redirectUri: redirectUrl,
        extraParams: {
          access_type: 'offline', // Refresh token almak için
        },
        additionalParameters: {},
      });

      // OAuth akışını başlat
      const result = await request.promptAsync(discovery, {
        useProxy: true, // Expo proxy sunucusunu kullan
        showInRecents: true,
      });

      console.log('OAuth result type:', result.type);
      console.log('OAuth result params:', result.params);
      if (result.type === 'error') {
        console.error('❌ OAuth error:', result.error);
        console.error('❌ OAuth error description:', result.params?.error_description);
      }

      if (result.type === 'success') {
        try {
          const { code } = result.params;

          if (!code) {
            console.error('❌ OAuth code bulunamadı. Result params:', result.params);
            showError('Google OAuth kodu alınamadı. Lütfen tekrar deneyin.');
            setIsGoogleLoading(false);
            return;
          }

          console.log('✅ OAuth code alındı, token exchange başlatılıyor...');

        // Access token almak için code'u exchange et
        // ÖNEMLİ: Authorization'da kullanılan redirect_uri ile token exchange'de kullanılan redirect_uri TAM OLARAK aynı olmalı
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: savedRedirectUrl, // Authorization'da kullanılan aynı redirect URI
          }).toString(),
        });
        
        console.log('🔄 Token exchange - Redirect URI:', savedRedirectUrl);

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ Token exchange error:', errorText);
          console.error('📤 Request URL:', GOOGLE_TOKEN_URL);
          console.error('📤 Redirect URI:', redirectUrl);
          console.error('📤 Client ID:', GOOGLE_CLIENT_ID);
          try {
            const errorJson = JSON.parse(errorText);
            console.error('📋 Error details:', JSON.stringify(errorJson, null, 2));
            showError(`Google token alınamadı: ${errorJson.error_description || errorJson.error || 'Bilinmeyen hata'}`);
          } catch {
            showError(`Google token alınamadı: ${errorText}`);
          }
          setIsGoogleLoading(false);
          return;
        }

        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;

        if (!access_token) {
          showError('Google access token alınamadı. Lütfen tekrar deneyin.');
          setIsGoogleLoading(false);
          return;
        }

        // Google API'den kullanıcı bilgilerini al
        const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          showError('Kullanıcı bilgileri alınamadı. Lütfen tekrar deneyin.');
          setIsGoogleLoading(false);
          return;
        }

        const userInfo = await userInfoResponse.json();
        console.log('Google user info:', userInfo);

        // Kullanıcı bilgilerini parse et
        const { id: googleId, email, name, picture } = userInfo;
        const nameParts = (name || '').trim().split(/\s+/);
        const ad = nameParts[0] || 'Kullanıcı';
        const soyad = nameParts.slice(1).join(' ') || '';

        // Supabase'de kullanıcı profilini kontrol et veya oluştur
        let profile = null;
        let userId = null;

        try {
          // Önce email ile mevcut kullanıcıyı kontrol et (eğer email kolonu varsa)
          // Eğer email kolonu yoksa, Google ID'yi kullanarak kontrol et
          // Şimdilik direkt yeni UUID oluştur ve insert et
          
          // Yeni kullanıcı için UUID oluştur
          userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          
          // Supabase'de profil oluştur
          const { data: newProfile, error: insertError } = await supabase
            .from('kullanici_profilleri')
            .insert({
              id: userId,
              ad: ad,
              soyad: soyad,
              telefon: null,
              rol_id: 2, // Varsayılan rol: kullanıcı
              aktif: true,
            })
            .select('*, roller(*)')
            .single();

          if (insertError) {
            // Eğer duplicate key hatası varsa, rastgele UUID çakışması olmuş demektir
            // Tekrar UUID oluştur ve dene (max 3 deneme)
            if (insertError.code === '23505') {
              console.log('⚠️ UUID çakışması, yeni UUID oluşturuluyor...');
              let retryCount = 0;
              const maxRetries = 3;
              
              while (retryCount < maxRetries) {
                userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = Math.random() * 16 | 0;
                  const v = c === 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });
                
                const { data: retryProfile, error: retryError } = await supabase
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
                
                if (!retryError && retryProfile) {
                  profile = retryProfile;
                  break;
                }
                
                retryCount++;
              }
              
              if (!profile) {
                console.error('Profil oluşturma hatası (UUID çakışması):', insertError);
                showError('Profil oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
                setIsGoogleLoading(false);
                return;
              }
            } else {
              console.error('Profil oluşturma hatası:', insertError);
              showError('Profil oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
              setIsGoogleLoading(false);
              return;
            }
          } else {
            profile = newProfile;
          }
        } catch (profileError) {
          console.error('Profil işleme hatası:', profileError);
          showError('Profil oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
          setIsGoogleLoading(false);
          return;
        }

        // Aktif kontrolü
        if (profile && profile.aktif === false) {
          showError('Hesabınız pasif durumda. Giriş yapamazsınız. Lütfen yönetici ile iletişime geçin.');
          setIsGoogleLoading(false);
          return;
        }

        // appStore'da state'leri güncelle
        // User objesi oluştur (Supabase auth formatına benzer)
        const userObject = {
          id: userId,
          email: email,
          user_metadata: {
            full_name: name,
            avatar_url: picture,
            email: email,
          },
        };

        if (appStore?.setUser) {
          appStore.setUser(userObject);
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
            // Profil yüklenemese bile devam et
          }
        }

        // Loading state'i kapat
        setIsGoogleLoading(false);

        // Navigation'ı yap
        const targetRoute = profile?.rol_id === 3 ? 'KasaScreen' : 'MainTabs';

        console.log('✅ Google OAuth başarılı, yönlendiriliyor:', targetRoute, 'Profil:', profile?.rol_id);

        try {
          navigation.reset({
            index: 0,
            routes: [{ name: targetRoute }],
          });

          setTimeout(() => {
            showSuccess('Giriş yapıldı', 'Hoş geldiniz!');
          }, 300);
        } catch (navError) {
          console.error('Navigation hatası:', navError);
          showError('Yönlendirme sırasında bir hata oluştu. Lütfen uygulamayı yeniden başlatın.');
        }
        } catch (successError) {
          console.error('❌ Google OAuth success bloğu hatası:', successError);
          console.error('Hata detayları:', JSON.stringify(successError, null, 2));
          showError('Giriş işlemi sırasında bir hata oluştu: ' + (successError.message || 'Bilinmeyen hata'));
          setIsGoogleLoading(false);
        }
      } else if (result.type === 'cancel') {
        showInfo('Google ile giriş iptal edildi.');
        setIsGoogleLoading(false);
      } else if (result.type === 'dismiss') {
        showInfo('Google ile giriş penceresi kapatıldı.');
        setIsGoogleLoading(false);
      } else {
        console.log('OAuth result type:', result.type);
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google ile giriş yapılırken hata:', error);
      showError('Google ile giriş yapılırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
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
});
