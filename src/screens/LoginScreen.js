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
        if (profile) {
          // Rol kontrolü - Kasa rolü (id: 3) ise KasaScreen'e yönlendir
          if (profile.rol_id === 3) {
            navigation.navigate('KasaScreen');
          } else {
            // Diğer roller için ana ekrana dön
            navigation.goBack();
          }
        } else {
          // Profil yoksa ana ekrana dön
          navigation.goBack();
        }
        
        // Toast mesajını navigation animasyonları tamamlandıktan sonra göster
        InteractionManager.runAfterInteractions(() => {
          showSuccess('Giriş yapıldı', 'Hoş geldiniz!');
        });
      }
    } catch (error) {
      console.error('Giriş yapılırken hata:', error);
      showError('Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);

    try {
      // expo-auth-session ile otomatik redirect URI oluştur
      // useProxy: false -> IP adresi kullanır (localhost bazı durumlarda çalışmaz)
      // Development (Expo Go): exp://<IP>:8081/--/auth/callback
      // Production build: com.kahvedukkani.app://auth/callback
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth/callback', 
        useProxy: false, // IP adresi kullan (localhost Android'de çalışmayabilir)
      });
      
      console.log('Redirect URL:', redirectUrl);
      
      // Supabase OAuth ile Google girişi başlat
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        showError(error.message || 'Google ile giriş yapılırken bir hata oluştu.');
        setIsGoogleLoading(false);
        return;
      }

      // OAuth URL'i aç
      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        let result;
        try {
          result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl
          );
        } catch (browserError) {
          // WebBrowser hatası oluşabilir ama OAuth deep linking ile devam edebilir
          console.log('WebBrowser error (OAuth may continue via deep linking):', browserError);
          // Hata mesajı gösterme, deep linking ile OAuth devam edebilir
          setIsGoogleLoading(false);
          return;
        }
        
        console.log('OAuth result:', result);

        if (result.type === 'success') {
          // URL'den hash fragment veya query params'ı al
          const url = result.url;
          let hashFragment = '';
          let queryParams = '';
          
          if (url.includes('#')) {
            hashFragment = url.split('#')[1];
          } else if (url.includes('?')) {
            queryParams = url.split('?')[1];
          }
          
          // Hash fragment'ten veya query params'tan token'ları çıkar
          const urlParams = new URLSearchParams(hashFragment || queryParams);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          const errorParam = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');

          if (errorParam) {
            showError(errorDescription || errorParam || 'Google ile giriş yapılırken bir hata oluştu.');
            setIsGoogleLoading(false);
            return;
          }

          if (accessToken && refreshToken) {
            // Session'ı set et
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              showError('Oturum oluşturulurken bir hata oluştu: ' + sessionError.message);
              setIsGoogleLoading(false);
              return;
            }

            if (sessionData?.user) {
              // Kullanıcı profilini yükle
              let profile = null;
              if (loadUserProfile && typeof loadUserProfile === 'function') {
                profile = await loadUserProfile(sessionData.user.id);
              } else {
                // Fallback: Direkt Supabase'den profil yükle
                console.warn('loadUserProfile fonksiyonu bulunamadı, direkt Supabase\'den yükleniyor');
                const { data: profileData, error: profileError } = await supabase
                  .from('kullanici_profilleri')
                  .select('*, roller(*)')
                  .eq('id', sessionData.user.id)
                  .single();
                
                if (!profileError && profileData) {
                  profile = profileData;
                  if (appStore?.setUserProfile) {
                    appStore.setUserProfile(profileData);
                  }
                }
              }

              // Eğer profil yoksa, Google'dan gelen bilgilerle oluştur
              if (!profile) {
                const userMetadata = sessionData.user.user_metadata;
                // Google'dan gelen isim bilgisini parse et
                const fullName = userMetadata?.full_name || userMetadata?.name || '';
                const nameParts = fullName.trim().split(/\s+/);
                const ad = nameParts[0] || 'Kullanıcı';
                const soyad = nameParts.slice(1).join(' ') || '';
                
                // Önce profil var mı kontrol et
                const { data: existingProfile, error: checkError } = await supabase
                  .from('kullanici_profilleri')
                  .select('id')
                  .eq('id', sessionData.user.id)
                  .maybeSingle(); // maybeSingle() kullan - kayıt yoksa null döner, hata vermez

                let profileError = null;

                // checkError varsa ve PGRST116 değilse (kayıt bulunamadı hatası normal)
                if (checkError && checkError.code !== 'PGRST116') {
                  console.error('Profil kontrolü hatası:', checkError);
                }

                if (existingProfile) {
                  // Profil varsa güncelle
                  const { error: updateError } = await supabase
                    .from('kullanici_profilleri')
                    .update({
                      ad: ad,
                      soyad: soyad,
                      telefon: null,
                      rol_id: 2, // Varsayılan rol: kullanıcı
                      aktif: true,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', sessionData.user.id);
                  
                  profileError = updateError;
                } else {
                  // Profil yoksa oluştur
                  const { error: insertError } = await supabase
                    .from('kullanici_profilleri')
                    .insert({
                      id: sessionData.user.id,
                      ad: ad,
                      soyad: soyad,
                      telefon: null,
                      rol_id: 2, // Varsayılan rol: kullanıcı
                      aktif: true,
                    });
                  
                  profileError = insertError;
                }

                if (!profileError) {
                  // Profili tekrar yükle
                  if (loadUserProfile && typeof loadUserProfile === 'function') {
                    profile = await loadUserProfile(sessionData.user.id);
                  } else {
                    const { data: profileData } = await supabase
                      .from('kullanici_profilleri')
                      .select('*, roller(*)')
                      .eq('id', sessionData.user.id)
                      .single();
                    if (profileData) {
                      profile = profileData;
                      if (appStore?.setUserProfile) {
                        appStore.setUserProfile(profileData);
                      }
                    }
                  }
                } else {
                  console.error('Profil oluşturma hatası:', profileError);
                  console.error('Hata detayları:', JSON.stringify(profileError, null, 2));
                }
              }
              
              // Aktif kontrolü - Pasif kullanıcılar giriş yapamaz
              if (profile && profile.aktif === false) {
                await supabase.auth.signOut();
                showError('Hesabınız pasif durumda. Giriş yapamazsınız. Lütfen yönetici ile iletişime geçin.');
                setIsGoogleLoading(false);
                return;
              }
              
              // Loading state'i kapat (navigation'dan önce)
              setIsGoogleLoading(false);
              
              // Navigation'ı InteractionManager ile yap
              InteractionManager.runAfterInteractions(() => {
                if (profile) {
                  // Rol kontrolü - Kasa rolü (id: 3) ise KasaScreen'e yönlendir
                  if (profile.rol_id === 3) {
                    navigation.navigate('KasaScreen');
                  } else {
                    navigation.goBack();
                  }
                } else {
                  navigation.goBack();
                }
                
                // Toast mesajını göster
                showSuccess('Giriş yapıldı', 'Hoş geldiniz!');
              });
            }
          }
        } else if (result.type === 'cancel') {
          showInfo('Google ile giriş iptal edildi.');
          setIsGoogleLoading(false);
        } else if (result.type === 'dismiss') {
          showInfo('Google ile giriş penceresi kapatıldı.');
          setIsGoogleLoading(false);
        } else {
          // OAuth başka bir durumda (deep linking ile devam edebilir)
          console.log('OAuth result type:', result.type);
          console.log('OAuth result:', result);
          // Loading state'i kapat, deep linking ile OAuth devam edebilir
          setIsGoogleLoading(false);
        }
      } else {
        console.error('OAuth URL alınamadı');
        showError('OAuth URL alınamadı. Lütfen tekrar deneyin.');
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google ile giriş yapılırken hata:', error);
      // WebBrowser hataları genellikle OAuth deep linking ile devam edebilir
      // Bu yüzden sadece gerçek kritik hatalarda kullanıcıya mesaj göster
      if (error.message && !error.message.includes('WebBrowser')) {
        showError('Google ile giriş yapılırken bir hata oluştu: ' + error.message);
      } else {
        // WebBrowser hatası - OAuth deep linking ile devam edebilir, sessizce logla
        console.log('WebBrowser hatası (OAuth deep linking ile devam edebilir):', error);
      }
    } finally {
      // finally bloğunda loading state'i kapatma - her durumda zaten kapatılıyor
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
