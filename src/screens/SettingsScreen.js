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
import { supabase } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import { showError, showSuccess } from '../utils/toast';

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

export default function SettingsScreen() {
  const navigation = useNavigation();
  const appStore = useAppStore();
  const { user, userProfile } = appStore;
  const loadUserProfile = appStore?.loadUserProfile;
  const insets = useSafeAreaInsets();
  const isLoggedIn = !!user;

  // Profil bilgileri state
  const [ad, setAd] = useState(userProfile?.ad || '');
  const [soyad, setSoyad] = useState(userProfile?.soyad || '');
  const [telefon, setTelefon] = useState(userProfile?.telefon || '');
  
  // Şifre değiştirme state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // İlk yüklemede profil bilgilerini set et ve loading'i kapat
  React.useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      
      // Eğer giriş yapılmışsa ve profil yoksa, profili yükle
      if (isLoggedIn && user && !userProfile) {
        if (loadUserProfile && typeof loadUserProfile === 'function') {
          await loadUserProfile(user.id);
        }
      }
      
      // Profil bilgilerini set et
      if (userProfile) {
        setAd(userProfile.ad || '');
        setSoyad(userProfile.soyad || '');
        setTelefon(userProfile.telefon || '');
      }
      
      // Kısa bir gecikme ile loading'i kapat (daha iyi UX için)
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };
    
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, isLoggedIn, user?.id]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleUpdateProfile = async () => {
    if (!isLoggedIn || !user) {
      showError('Lütfen önce giriş yapın.');
      return;
    }

    if (!ad.trim() || !soyad.trim()) {
      showError('Ad ve Soyad alanları gereklidir.');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      // Kullanıcı profilini güncelle
      const { error: updateError } = await supabase
        .from('kullanici_profilleri')
        .update({
          ad: ad.trim(),
          soyad: soyad.trim(),
          telefon: telefon.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        showError(updateError.message || 'Profil güncellenirken bir hata oluştu.');
        setIsUpdatingProfile(false);
        return;
      }

      // Profili yeniden yükle
      if (loadUserProfile && typeof loadUserProfile === 'function') {
        await loadUserProfile(user.id);
      } else {
        // Fallback: Direkt Supabase'den profil yükle
        const { data: profileData, error: profileError } = await supabase
          .from('kullanici_profilleri')
          .select('*, roller(*)')
          .eq('id', user.id)
          .maybeSingle(); // maybeSingle() kullan - profil yoksa null döner, hata vermez
        
        // PGRST116 hatası normal (profil bulunamadı), diğer hataları logla
        if (profileError && profileError.code !== 'PGRST116') {
        }
        
        if (profileData && appStore?.setUserProfile) {
          appStore.setUserProfile(profileData);
        }
      }

      showSuccess('Profil bilgileri başarıyla güncellendi.');
    } catch (error) {
      showError('Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isLoggedIn || !user) {
      showError('Lütfen önce giriş yapın.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Tüm şifre alanları gereklidir.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      showError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Önce mevcut şifreyi doğrula
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        showError('Mevcut şifre yanlış.');
        setIsChangingPassword(false);
        return;
      }

      // Şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        showError(updateError.message || 'Şifre güncellenirken bir hata oluştu.');
        setIsChangingPassword(false);
        return;
      }

      // Formu temizle
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showSuccess('Şifre başarıyla güncellendi.');
    } catch (error) {
      showError('Şifre güncellenirken bir hata oluştu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderInputField = (label, value, onChangeText, placeholder, icon, keyboardType = 'default', secureTextEntry = false, showPasswordToggle = false, showPassword = false, onTogglePassword = null) => (
    <View style={styles.inputContainer}>
      <Text style={[
        styles.inputLabel,
        { fontSize: getResponsiveValue(14, 15, 16, 18) }
      ]}>
        {label}
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
          name={icon} 
          size={getResponsiveValue(20, 22, 24, 26)} 
          color="#8B4513" 
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.textInput,
            { fontSize: getResponsiveValue(16, 17, 18, 20) }
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={isLoggedIn}
        />
        {showPasswordToggle && onTogglePassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={getResponsiveValue(20, 22, 24, 26)} 
              color="#8B4513" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>Ayarlar</Text>
          <View style={styles.placeholder} />
        </View>

        {isLoading ? (
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {!isLoggedIn ? (
            // Giriş yapılmamışsa
            <View style={styles.notLoggedInContainer}>
              <Ionicons 
                name="lock-closed" 
                size={getResponsiveValue(64, 72, 80, 88)} 
                color="#9CA3AF"
                style={styles.notLoggedInIcon}
              />
              <Text style={[
                styles.notLoggedInTitle,
                { fontSize: getResponsiveValue(20, 22, 24, 26) }
              ]}>
                Giriş Yapın
              </Text>
              <Text style={[
                styles.notLoggedInText,
                { fontSize: getResponsiveValue(14, 15, 16, 18) }
              ]}>
                Ayarları görüntülemek ve düzenlemek için lütfen giriş yapın.
              </Text>
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
                onPress={() => navigation.navigate('LoginScreen')}
              >
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
              </TouchableOpacity>
            </View>
          ) : (
            // Giriş yapılmışsa
            <>
              {/* Profil Bilgileri Bölümü */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name="person" 
                    size={getResponsiveValue(24, 26, 28, 30)} 
                    color="#8B4513" 
                  />
                  <Text style={[
                    styles.sectionTitle,
                    { fontSize: getResponsiveValue(20, 22, 24, 26) }
                  ]}>
                    Profil Bilgileri
                  </Text>
                </View>

                {renderInputField(
                  'Ad',
                  ad,
                  setAd,
                  'Adınızı girin',
                  'person-outline'
                )}

                {renderInputField(
                  'Soyad',
                  soyad,
                  setSoyad,
                  'Soyadınızı girin',
                  'person-outline'
                )}

                <View style={styles.inputContainer}>
                  <Text style={[
                    styles.inputLabel,
                    { fontSize: getResponsiveValue(14, 15, 16, 18) }
                  ]}>
                    E-posta
                  </Text>
                  <View style={[
                    styles.inputWrapper,
                    styles.disabledInput,
                    {
                      paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                      paddingVertical: getResponsiveValue(12, 14, 16, 18),
                      borderRadius: getResponsiveValue(12, 14, 16, 18),
                    }
                  ]}>
                    <Ionicons 
                      name="mail-outline" 
                      size={getResponsiveValue(20, 22, 24, 26)} 
                      color="#9CA3AF" 
                      style={styles.inputIcon}
                    />
                    <Text style={[
                      styles.textInput,
                      styles.disabledText,
                      { fontSize: getResponsiveValue(16, 17, 18, 20) }
                    ]}>
                      {user?.email || 'E-posta adresiniz'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.helperText,
                    { fontSize: getResponsiveValue(12, 13, 14, 16) }
                  ]}>
                    E-posta adresi değiştirilemez
                  </Text>
                </View>

                {renderInputField(
                  'Telefon',
                  telefon,
                  setTelefon,
                  'Telefon numaranızı girin (Opsiyonel)',
                  'call-outline',
                  'phone-pad'
                )}

                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    {
                      paddingVertical: getResponsiveValue(16, 18, 20, 22),
                      paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                      borderRadius: getResponsiveValue(12, 14, 16, 18),
                      marginTop: getResponsiveValue(16, 18, 20, 22),
                    }
                  ]}
                  onPress={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <View style={styles.updateButtonContent}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={getResponsiveValue(20, 22, 24, 26)} 
                        color="white" 
                      />
                      <Text style={[
                        styles.updateButtonText,
                        { fontSize: getResponsiveValue(16, 17, 18, 20) }
                      ]}>
                        Profili Güncelle
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Şifre Değiştirme Bölümü */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name="lock-closed" 
                    size={getResponsiveValue(24, 26, 28, 30)} 
                    color="#8B4513" 
                  />
                  <Text style={[
                    styles.sectionTitle,
                    { fontSize: getResponsiveValue(20, 22, 24, 26) }
                  ]}>
                    Şifre Değiştir
                  </Text>
                </View>

                {renderInputField(
                  'Mevcut Şifre',
                  currentPassword,
                  setCurrentPassword,
                  'Mevcut şifrenizi girin',
                  'lock-closed-outline',
                  'default',
                  true,
                  true,
                  showCurrentPassword,
                  () => setShowCurrentPassword(!showCurrentPassword)
                )}

                {renderInputField(
                  'Yeni Şifre',
                  newPassword,
                  setNewPassword,
                  'Yeni şifrenizi girin',
                  'lock-closed-outline',
                  'default',
                  true,
                  true,
                  showNewPassword,
                  () => setShowNewPassword(!showNewPassword)
                )}

                {renderInputField(
                  'Yeni Şifre Tekrar',
                  confirmPassword,
                  setConfirmPassword,
                  'Yeni şifrenizi tekrar girin',
                  'lock-closed-outline',
                  'default',
                  true,
                  true,
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword)
                )}

                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    {
                      paddingVertical: getResponsiveValue(16, 18, 20, 22),
                      paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                      borderRadius: getResponsiveValue(12, 14, 16, 18),
                      marginTop: getResponsiveValue(16, 18, 20, 22),
                    }
                  ]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <View style={styles.updateButtonContent}>
                      <Ionicons 
                        name="key" 
                        size={getResponsiveValue(20, 22, 24, 26)} 
                        color="white" 
                      />
                      <Text style={[
                        styles.updateButtonText,
                        { fontSize: getResponsiveValue(16, 17, 18, 20) }
                      ]}>
                        Şifreyi Değiştir
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Hesap Bilgileri Bölümü */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name="information-circle" 
                    size={getResponsiveValue(24, 26, 28, 30)} 
                    color="#8B4513" 
                  />
                  <Text style={[
                    styles.sectionTitle,
                    { fontSize: getResponsiveValue(20, 22, 24, 26) }
                  ]}>
                    Hesap Bilgileri
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={[
                      styles.infoLabel,
                      { fontSize: getResponsiveValue(14, 15, 16, 18) }
                    ]}>
                      Rol:
                    </Text>
                    <Text style={[
                      styles.infoValue,
                      { fontSize: getResponsiveValue(14, 15, 16, 18) }
                    ]}>
                      {userProfile?.roller?.ad || 'Kullanıcı'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[
                      styles.infoLabel,
                      { fontSize: getResponsiveValue(14, 15, 16, 18) }
                    ]}>
                      Hesap Durumu:
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={[
                        styles.statusText,
                        { fontSize: getResponsiveValue(12, 13, 14, 16) }
                      ]}>
                        {userProfile?.aktif ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingBottom: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(24, 28, 32, 36),
    paddingBottom: getResponsiveValue(40, 48, 56, 64),
  },
  notLoggedInContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveValue(60, 80, 100, 120),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  notLoggedInIcon: {
    marginBottom: getResponsiveValue(24, 28, 32, 36),
  },
  notLoggedInTitle: {
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    textAlign: 'center',
  },
  notLoggedInText: {
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  loginButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  section: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(20, 24, 28, 32),
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, 24, 28, 32),
    gap: getResponsiveValue(12, 14, 16, 18),
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
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
    backgroundColor: '#F9FAFB',
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
  updateButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  updateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  infoLabel: {
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'System',
  },
  infoValue: {
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'System',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 7, 8, 9),
    borderRadius: getResponsiveValue(12, 14, 16, 18),
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  helperText: {
    color: '#9CA3AF',
    marginTop: getResponsiveValue(4, 5, 6, 8),
    fontFamily: 'System',
    fontStyle: 'italic',
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

