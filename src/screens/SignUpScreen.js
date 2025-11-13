import React, { useState } from 'react';
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
  ScrollView
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

export default function SignUpScreen() {
  const navigation = useNavigation();
  const appStore = useAppStore();
  const loadUserProfile = appStore?.loadUserProfile;
  const insets = useSafeAreaInsets();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Şifre doğrulama fonksiyonu
  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return { valid: false, message: 'Şifre en az 8 karakter olmalıdır.' };
    }
    
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: 'Şifre en az bir küçük harf içermelidir.' };
    }
    
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: 'Şifre en az bir büyük harf içermelidir.' };
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      return { valid: false, message: 'Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.).' };
    }
    
    return { valid: true };
  };

  const handleSignUp = async () => {
    if (!ad.trim() || !soyad.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showError('Ad, Soyad, E-posta ve Şifre alanları gereklidir.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Şifreler eşleşmiyor.');
      return;
    }

    // Şifre doğrulama
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showError(passwordValidation.message);
      return;
    }

    setIsLoading(true);

    try {
      // Kullanıcı adını oluştur (Ad + Soyad)
      const fullName = `${ad.trim()} ${soyad.trim()}`.trim();
      
      // Supabase Auth ile kayıt ol - display name ekle
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: fullName,
            ad: ad.trim(),
            soyad: soyad.trim(),
            telefon: telefon.trim() || null,
          }
        }
      });

      if (authError) {
        showError(authError.message || 'Kayıt olurken bir hata oluştu.');
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Önce profil var mı kontrol et
        const { data: existingProfile, error: checkError } = await supabase
          .from('kullanici_profilleri')
          .select('id')
          .eq('id', authData.user.id)
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
              ad: ad.trim(),
              soyad: soyad.trim(),
              telefon: telefon.trim() || null,
              rol_id: 2, // Varsayılan rol: kullanıcı
              aktif: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authData.user.id);
          
          profileError = updateError;
        } else {
          // Profil yoksa oluştur
          const { error: insertError } = await supabase
            .from('kullanici_profilleri')
            .insert({
              id: authData.user.id, // UUID - auth.users'dan geliyor
              ad: ad.trim(),
              soyad: soyad.trim(),
              telefon: telefon.trim() || null, // Telefon opsiyonel
              rol_id: 2, // Varsayılan rol: kullanıcı
              aktif: true,
              // created_at ve updated_at otomatik olarak ekleniyor (default now())
            });
          
          profileError = insertError;
        }

        if (profileError) {
          console.error('Profil oluşturma hatası:', profileError);
          console.error('Hata detayları:', JSON.stringify(profileError, null, 2));
          showError(`Profil kaydedilemedi: ${profileError.message || 'Bilinmeyen hata'}`);
          // Hata durumunda da çıkış yap
          await supabase.auth.signOut();
          setTimeout(() => {
            navigation.navigate('LoginScreen');
          }, 2000);
          setIsLoading(false);
          return;
        }

        // Kayıt başarılı - kullanıcıyı çıkış yaptır (otomatik giriş yapmasın)
        await supabase.auth.signOut();

        showSuccess('Kayıt işlemi başarıyla tamamlandı!', 'Lütfen giriş yapın.');
        setTimeout(() => {
          navigation.navigate('LoginScreen');
        }, 2000);
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showError('Kayıt olurken bir hata oluştu.');
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
      // Google OAuth Client ID kontrolü
      if (!GOOGLE_CLIENT_ID) {
        showError('Google OAuth yapılandırması eksik. Lütfen Google Client ID\'yi ayarlayın.');
        setIsGoogleLoading(false);
        return;
      }

      // Redirect URI oluştur - useProxy: true kullan
      let redirectUrl = AuthSession.makeRedirectUri({
        path: GOOGLE_REDIRECT_PATH,
        useProxy: true,
        native: false,
      });
      
      // Eğer hala custom scheme kullanıyorsa, manuel olarak Expo proxy URL'ini oluştur
      if (redirectUrl.startsWith('com.kahvedukkani.app://') || redirectUrl.startsWith('exp://')) {
        redirectUrl = `https://auth.expo.io/@alpsungurk/expo-app`;
        console.log('⚠️ Custom scheme tespit edildi, Expo proxy URL kullanılıyor:', redirectUrl);
      }

      console.log('🔗 Redirect URL:', redirectUrl);
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
          access_type: 'offline',
        },
        additionalParameters: {},
      });

      // OAuth akışını başlat
      const result = await request.promptAsync(discovery, {
        useProxy: true,
        showInRecents: true,
      });

      console.log('OAuth result type:', result.type);
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
          const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              code: code,
              grant_type: 'authorization_code',
              redirect_uri: savedRedirectUrl,
            }).toString(),
          });
          
          console.log('🔄 Token exchange - Redirect URI:', savedRedirectUrl);

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('❌ Token exchange error:', errorText);
            try {
              const errorJson = JSON.parse(errorText);
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
                rol_id: 2,
                aktif: true,
              })
              .select('*, roller(*)')
              .single();

            if (insertError) {
              // Eğer duplicate key hatası varsa, rastgele UUID çakışması olmuş demektir
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
              showSuccess('Kayıt başarılı', 'Hoş geldiniz!');
            }, 300);
          } catch (navError) {
            console.error('Navigation hatası:', navError);
            showError('Yönlendirme sırasında bir hata oluştu. Lütfen uygulamayı yeniden başlatın.');
          }
        } catch (successError) {
          console.error('❌ Google OAuth success bloğu hatası:', successError);
          showError('Kayıt işlemi sırasında bir hata oluştu: ' + (successError.message || 'Bilinmeyen hata'));
          setIsGoogleLoading(false);
        }
      } else if (result.type === 'cancel') {
        showInfo('Google ile kayıt iptal edildi.');
        setIsGoogleLoading(false);
      } else if (result.type === 'dismiss') {
        showInfo('Google ile kayıt penceresi kapatıldı.');
        setIsGoogleLoading(false);
      } else {
        console.log('OAuth result type:', result.type);
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google ile kayıt yapılırken hata:', error);
      showError('Google ile kayıt yapılırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      setIsGoogleLoading(false);
    }
  };

  const handleLoginPress = () => {
    navigation.navigate('LoginScreen');
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
          <Text style={styles.headerTitle}>Kayıt Ol</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Kayıt Formu */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo ve Başlık */}
          <View style={styles.logoContainer}>
            <Ionicons 
              name="person-add" 
              size={getResponsiveValue(40, 44, 48, 52)} 
              color="#8B4513"
              style={styles.logoIcon}
            />
            <Text style={[
              styles.logoText,
              { fontSize: getResponsiveValue(20, 22, 24, 26) }
            ]}>
              Hesap Oluştur
            </Text>
            <Text style={[
              styles.logoSubtext,
              { fontSize: getResponsiveValue(12, 13, 14, 16) }
            ]}>
              Yeni hesap oluşturmak için bilgilerinizi girin
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Ad
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
                name="person-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Adınızı girin"
                placeholderTextColor="#9CA3AF"
                value={ad}
                onChangeText={setAd}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Soyad
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
                name="person-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Soyadınızı girin"
                placeholderTextColor="#9CA3AF"
                value={soyad}
                onChangeText={setSoyad}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

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
              Telefon <Text style={styles.optionalText}>(Opsiyonel)</Text>
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
                name="call-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Telefon numaranızı girin"
                placeholderTextColor="#9CA3AF"
                value={telefon}
                onChangeText={setTelefon}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
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
            {/* Şifre Gereksinimleri */}
            <View style={styles.passwordRequirements}>
              <Text style={[
                styles.passwordRequirementText,
                { fontSize: getResponsiveValue(11, 12, 13, 14) }
              ]}>
                Şifre gereksinimleri:
              </Text>
              <Text style={[
                styles.passwordRequirementItem,
                { fontSize: getResponsiveValue(11, 12, 13, 14) },
                password.length >= 8 && styles.passwordRequirementMet
              ]}>
                • En az 8 karakter
              </Text>
              <Text style={[
                styles.passwordRequirementItem,
                { fontSize: getResponsiveValue(11, 12, 13, 14) },
                /[a-z]/.test(password) && styles.passwordRequirementMet
              ]}>
                • En az bir küçük harf
              </Text>
              <Text style={[
                styles.passwordRequirementItem,
                { fontSize: getResponsiveValue(11, 12, 13, 14) },
                /[A-Z]/.test(password) && styles.passwordRequirementMet
              ]}>
                • En az bir büyük harf
              </Text>
              <Text style={[
                styles.passwordRequirementItem,
                { fontSize: getResponsiveValue(11, 12, 13, 14) },
                /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && styles.passwordRequirementMet
              ]}>
                • En az bir özel karakter (!@#$%^&* vb.)
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Şifre Tekrar
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
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="#8B4513" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.signUpButton,
              {
                paddingVertical: getResponsiveValue(16, 18, 20, 22),
                paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
                marginTop: getResponsiveValue(24, 28, 32, 36),
              }
            ]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View style={styles.signUpButtonContent}>
                <Ionicons 
                  name="person-add" 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="white" 
                />
                <Text style={[
                  styles.signUpButtonText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Kayıt Ol
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
                  Google ile Kayıt Ol
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Giriş Yap Linki */}
          <View style={styles.loginLinkContainer}>
            <Text style={[
              styles.loginLinkText,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Zaten hesabınız var mı?{' '}
            </Text>
            <TouchableOpacity onPress={handleLoginPress}>
              <Text style={[
                styles.loginLinkButton,
                { fontSize: getResponsiveValue(14, 15, 16, 18) }
              ]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: getResponsiveValue(40, 48, 56, 64),
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: getResponsiveValue(16, 20, 24, 28),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(20, 24, 28, 32),
  },
  logoIcon: {
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  logoText: {
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
  },
  logoSubtext: {
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  formContainer: {
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(8, 10, 12, 14),
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
  optionalText: {
    fontWeight: '400',
    color: '#9CA3AF',
    fontSize: getResponsiveValue(12, 13, 14, 16),
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
  passwordRequirements: {
    marginTop: getResponsiveValue(8, 10, 12, 14),
    padding: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  passwordRequirementText: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
    fontFamily: 'System',
  },
  passwordRequirementItem: {
    color: '#6B7280',
    marginTop: getResponsiveValue(2, 3, 4, 5),
    fontFamily: 'System',
  },
  passwordRequirementMet: {
    color: '#10B981',
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  signUpButtonText: {
    color: 'white',
    fontWeight: '600',
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
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveValue(20, 24, 28, 32),
  },
  loginLinkText: {
    color: '#6B7280',
    fontFamily: 'System',
  },
  loginLinkButton: {
    color: '#8B4513',
    fontWeight: '600',
    fontFamily: 'System',
  },
});

