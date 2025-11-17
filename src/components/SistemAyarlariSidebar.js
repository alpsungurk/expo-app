import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
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

// Ana Sidebar Component
const SistemAyarlariSidebar = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { getSistemAyarı, user, userProfile, setUser, setUserProfile } = useAppStore();
  const { clearCart, clearTableInfo } = useCartStore();
  
  const kafeAdi = getSistemAyarı('kafe_adi');
  const isLoggedIn = !!user;
  
  // Çıkış onay modalı için state
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Animasyon değerleri
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Sidebar açılma/kapanma animasyonu
  React.useEffect(() => {
    if (visible) {
      // Açılma animasyonu
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Kapanma animasyonu - daha hızlı
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Sidebar genişliğini hesapla
  const sidebarWidth = getResponsiveValue(width * 0.85, width * 0.75, width * 0.65, width * 0.55);
  
  // Animasyon stilleri
  const sidebarAnimatedStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-sidebarWidth, 0],
        }),
      },
    ],
  };

  const overlayAnimatedStyle = {
    opacity: fadeAnim,
  };

  // Kapatma fonksiyonu - animasyon ile kapat
  const handleClose = () => {
    // Kapanma animasyonunu başlat - daha hızlı tepki için
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animasyon tamamlandıktan sonra kapat
      onClose();
    });
  };

  const handleLoginPress = () => {
    // Sidebar'ı kapat, sonra giriş ekranına git
    handleClose();
    setTimeout(() => {
      navigation.navigate('LoginScreen');
    }, 250);
  };

  const handleLogoutPress = () => {
    // Onay modalını göster
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      // Çıkış yap - işlemin tamamlanmasını bekle
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Çıkış hatası:', error);
        showError('Çıkış yapılırken bir hata oluştu: ' + error.message);
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        return;
      }
      
      // SignOut işleminin tamamlanması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Tüm state'leri temizle
      setUser(null);
      setUserProfile(null);
      clearCart(); // Sepeti temizle
      clearTableInfo(); // Masa bilgilerini temizle
      
      // Modal'ı kapat
      setShowLogoutModal(false);
      
      // Sidebar'ı kapat (animasyon ile)
      handleClose();
      
      // Ana ekrana dön - navigation reset ile tüm state'leri temizle
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        
        // Başarı mesajını göster
        showSuccess('Çıkış yapıldı.');
        setIsLoggingOut(false);
      }, 550);
    } catch (error) {
      console.error('Çıkış hatası:', error);
      showError('Çıkış yapılırken bir hata oluştu.');
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleProfilePress = () => {
    // Sidebar'ı kapat, sonra ayarlar sayfasına git
    handleClose();
    setTimeout(() => {
      navigation.navigate('SettingsScreen');
    }, 300);
  };

  // Kullanıcı adını oluştur
  const getUserName = () => {
    if (userProfile) {
      return `${userProfile.ad} ${userProfile.soyad}`.trim();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Kullanıcı';
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      hardwareAccelerated={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <Animated.View 
          style={[styles.modalOverlay, overlayAnimatedStyle]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: sidebarWidth,
              right: 0,
              bottom: 0,
            }}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sidebar,
            {
              width: sidebarWidth,
            },
            sidebarAnimatedStyle
          ]}
        >
        <SafeAreaView 
          style={styles.sidebarSafeArea}
          edges={['top', 'left', 'right']}
        >
          <View 
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            style={styles.sidebarInner}
          >
            {/* Kafe Adı Header Bar - En Üstte */}
            <View style={styles.kafeAdiHeaderBar}>
            <View style={styles.kafeAdiHeaderContent}>
              <View style={[
                styles.kafeAdiIcon,
                {
                  width: getResponsiveValue(80, 90, 100, 110),
                  height: getResponsiveValue(80, 90, 100, 110),
                  borderRadius: getResponsiveValue(40, 45, 50, 55),
                }
              ]}>
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={{
                    width: getResponsiveValue(80, 90, 100, 110),
                    height: getResponsiveValue(80, 90, 100, 110),
                  }}
                  resizeMode="contain"
                />
              </View>
              <Text style={[
                styles.kafeAdiText,
                { fontSize: getResponsiveValue(18, 20, 22, 24) }
              ]}>
                {kafeAdi || 'Kafe'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  width: getResponsiveValue(32, 36, 40, 44),
                  height: getResponsiveValue(32, 36, 40, 44),
                  borderRadius: getResponsiveValue(16, 18, 20, 22),
                }
              ]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={getResponsiveValue(18, 20, 22, 24)} color="#8B4513" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarWrapper}>
            <ScrollView 
              style={styles.sidebarContent} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* Profile Card - Giriş yapılmışsa göster */}
              {isLoggedIn && (
                <View
                  style={[
                  styles.profileCard,
                  {
                    padding: getResponsiveValue(16, 18, 20, 22),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                    marginBottom: getResponsiveValue(20, 24, 28, 32),
                  }
                  ]}
                >
                  <View style={[
                    styles.profileIcon,
                    {
                      width: getResponsiveValue(50, 56, 62, 68),
                      height: getResponsiveValue(50, 56, 62, 68),
                      borderRadius: getResponsiveValue(25, 28, 31, 34),
                      marginBottom: getResponsiveValue(12, 14, 16, 18),
                    }
                  ]}>
                    <Ionicons 
                      name="person" 
                      size={getResponsiveValue(28, 32, 36, 40)} 
                      color="#8B4513" 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.profileName,
                      { fontSize: getResponsiveValue(18, 20, 22, 24) }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getUserName()}
                  </Text>
                  <Text 
                    style={[
                      styles.profileEmail,
                      { fontSize: getResponsiveValue(13, 14, 15, 16) }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {user?.email || ''}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.settingsButton,
                      {
                        paddingVertical: getResponsiveValue(10, 12, 14, 16),
                        paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
                        borderRadius: getResponsiveValue(8, 10, 12, 14),
                        marginTop: getResponsiveValue(12, 14, 16, 18),
                      }
                    ]}
                    onPress={handleProfilePress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingsButtonContent}>
                      <Ionicons 
                        name="settings-outline" 
                        size={getResponsiveValue(18, 20, 22, 24)} 
                        color="white" 
                      />
                      <Text style={[
                        styles.settingsButtonText,
                        { fontSize: getResponsiveValue(14, 15, 16, 18) }
                      ]}>
                        Ayarlar
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Uygulama Özellikleri Bölümü */}
              <View style={styles.appFeaturesSection}>
                {/* Hoş Geldiniz Mesajı */}
                {!isLoggedIn && (
                  <View style={[
                    styles.welcomeMessageCard,
                    {
                      padding: getResponsiveValue(12, 14, 16, 18),
                      borderRadius: getResponsiveValue(12, 14, 16, 18),
                      marginBottom: getResponsiveValue(10, 12, 14, 16),
                    }
                  ]}>
                    <View style={styles.welcomeMessageContent}>
                      <Ionicons 
                        name="gift" 
                        size={getResponsiveValue(20, 22, 24, 26)} 
                        color="#8B4513" 
                        style={{ marginRight: getResponsiveValue(8, 10, 12, 14) }}
                      />
                      <Text style={[
                        styles.welcomeMessageText,
                        { fontSize: getResponsiveValue(14, 15, 16, 17) }
                      ]}>
                        Kampanyalar için giriş yapın, üye olun!
                      </Text>
                    </View>
                  </View>
                )}

                {/* QR Kod ile Hızlı Sipariş */}
                <View style={[
                  styles.featureItem,
                  {
                    padding: getResponsiveValue(14, 16, 18, 20),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                    marginBottom: getResponsiveValue(12, 14, 16, 18),
                  }
                ]}>
                  <View style={[
                    styles.featureIconContainer,
                    {
                      width: getResponsiveValue(44, 48, 52, 56),
                      height: getResponsiveValue(44, 48, 52, 56),
                      borderRadius: getResponsiveValue(22, 24, 26, 28),
                    }
                  ]}>
                    <Ionicons 
                      name="qr-code" 
                      size={getResponsiveValue(22, 24, 26, 28)} 
                      color="#8B4513" 
                    />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={[
                      styles.featureTitle,
                      { fontSize: getResponsiveValue(15, 16, 17, 18) }
                    ]}>
                      QR Kod ile Hızlı Sipariş
                    </Text>
                    <Text style={[
                      styles.featureDescription,
                      { fontSize: getResponsiveValue(13, 14, 15, 16) }
                    ]}>
                      Masanızın üzerindeki QR kodu tarayarak hızlıca sipariş verebilirsiniz.
                    </Text>
                  </View>
                </View>

                {/* Geniş Ürün Yelpazesi */}
                <View style={[
                  styles.featureItem,
                  {
                    padding: getResponsiveValue(14, 16, 18, 20),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                    marginBottom: getResponsiveValue(12, 14, 16, 18),
                  }
                ]}>
                  <View style={[
                    styles.featureIconContainer,
                    {
                      width: getResponsiveValue(44, 48, 52, 56),
                      height: getResponsiveValue(44, 48, 52, 56),
                      borderRadius: getResponsiveValue(22, 24, 26, 28),
                    }
                  ]}>
                    <Ionicons 
                      name="restaurant" 
                      size={getResponsiveValue(22, 24, 26, 28)} 
                      color="#8B4513" 
                    />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={[
                      styles.featureTitle,
                      { fontSize: getResponsiveValue(15, 16, 17, 18) }
                    ]}>
                      Geniş Ürün Yelpazesi
                    </Text>
                    <Text style={[
                      styles.featureDescription,
                      { fontSize: getResponsiveValue(13, 14, 15, 16) }
                    ]}>
                      Çeşitli kategorilerden oluşan zengin menümüzü keşfedin.
                    </Text>
                  </View>
                </View>

                {/* Sipariş Takibi */}
                <View style={[
                  styles.featureItem,
                  {
                    padding: getResponsiveValue(14, 16, 18, 20),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                    marginBottom: 0,
                  }
                ]}>
                  <View style={[
                    styles.featureIconContainer,
                    {
                      width: getResponsiveValue(44, 48, 52, 56),
                      height: getResponsiveValue(44, 48, 52, 56),
                      borderRadius: getResponsiveValue(22, 24, 26, 28),
                    }
                  ]}>
                    <Ionicons 
                      name="notifications" 
                      size={getResponsiveValue(22, 24, 26, 28)} 
                      color="#8B4513" 
                    />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={[
                      styles.featureTitle,
                      { fontSize: getResponsiveValue(15, 16, 17, 18) }
                    ]}>
                      Sipariş Takibi
                    </Text>
                    <Text style={[
                      styles.featureDescription,
                      { fontSize: getResponsiveValue(13, 14, 15, 16) }
                    ]}>
                      Siparişlerinizi kolayca yönetin ve takip edin
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Giriş Yap / Çıkış Yap Butonu - SafeAreaView ile sarıldı */}
            <SafeAreaView style={styles.loginButtonContainer} edges={['bottom']}>
              {isLoggedIn ? (
                <TouchableOpacity
                  style={[
                    styles.logoutButton,
                    {
                      paddingVertical: getResponsiveValue(16, 18, 20, 22),
                      paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
                      borderRadius: getResponsiveValue(16, 18, 20, 22),
                    }
                  ]}
                  onPress={handleLogoutPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.loginButtonContent}>
                    <Ionicons 
                      name="log-out" 
                      size={getResponsiveValue(22, 24, 26, 28)} 
                      color="white" 
                    />
                    <Text style={[
                      styles.loginButtonText,
                      { fontSize: getResponsiveValue(16, 17, 18, 20) }
                    ]}>
                      Çıkış Yap
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    {
                      paddingVertical: getResponsiveValue(16, 18, 20, 22),
                      paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
                      borderRadius: getResponsiveValue(16, 18, 20, 22),
                    }
                  ]}
                  onPress={handleLoginPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.loginButtonContent}>
                    <Ionicons 
                      name="log-in" 
                      size={getResponsiveValue(22, 24, 26, 28)} 
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
              )}
            </SafeAreaView>
          </View>
          </View>
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
    
    {/* Çıkış Onay Modalı */}
    <Modal
      visible={showLogoutModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleLogoutCancel}
    >
      <View style={styles.logoutModalContainer}>
        <TouchableOpacity
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={handleLogoutCancel}
        />
        <View style={[
          styles.logoutModalContent,
          {
            padding: getResponsiveValue(24, 28, 32, 36),
            borderRadius: getResponsiveValue(16, 18, 20, 22),
          }
        ]}>
          <View style={[
            styles.logoutModalIcon,
            {
              width: getResponsiveValue(60, 64, 68, 72),
              height: getResponsiveValue(60, 64, 68, 72),
              borderRadius: getResponsiveValue(30, 32, 34, 36),
              marginBottom: getResponsiveValue(16, 18, 20, 22),
            }
          ]}>
            <Ionicons 
              name="log-out" 
              size={getResponsiveValue(32, 36, 40, 44)} 
              color="#EF4444" 
            />
          </View>
          
          <Text style={[
            styles.logoutModalTitle,
            { fontSize: getResponsiveValue(20, 22, 24, 26) }
          ]}>
            Çıkış Yap
          </Text>
          
          <Text style={[
            styles.logoutModalMessage,
            { fontSize: getResponsiveValue(15, 16, 17, 18) }
          ]}>
            Çıkış yapmak istediğinize emin misiniz?
          </Text>
          
          <View style={styles.logoutModalButtons}>
            <TouchableOpacity
              style={[
                styles.logoutModalCancelButton,
                {
                  paddingVertical: getResponsiveValue(14, 16, 18, 20),
                  paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                  borderRadius: getResponsiveValue(12, 14, 16, 18),
                  marginRight: getResponsiveValue(12, 14, 16, 18),
                }
              ]}
              onPress={handleLogoutCancel}
              disabled={isLoggingOut}
            >
              <Text style={[
                styles.logoutModalCancelText,
                { fontSize: getResponsiveValue(16, 17, 18, 20) }
              ]}>
                İptal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.logoutModalConfirmButton,
                {
                  paddingVertical: getResponsiveValue(14, 16, 18, 20),
                  paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                  borderRadius: getResponsiveValue(12, 14, 16, 18),
                }
              ]}
              onPress={handleLogoutConfirm}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[
                  styles.logoutModalConfirmText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Çıkış Yap
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Modal ve Sidebar Stilleri
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sidebar: {
    height: '100%',
    backgroundColor: '#F9FAFB',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 15,
    zIndex: 1000,
  },
  sidebarSafeArea: {
    flex: 1,
  },
  sidebarInner: {
    flex: 1,
  },
  kafeAdiHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  kafeAdiHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    backgroundColor: 'rgba(139, 69, 19, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarWrapper: {
    flex: 1,
  },
  sidebarContent: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(16, 18, 20, 22),
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: getResponsiveValue(8, 10, 12, 14),
    paddingBottom: getResponsiveValue(20, 24, 28, 32),
  },
  loginButtonContainer: {
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    paddingBottom: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Kafe Adı Stilleri
  kafeAdiIcon: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  kafeAdiText: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#8B4513',
    letterSpacing: 0.3,
  },
  
  // Profile Card Stilleri
  profileCard: {
    backgroundColor: 'white',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
    textAlign: 'center',
    width: '100%',
  },
  profileEmail: {
    fontWeight: '400',
    fontFamily: 'System',
    color: '#6B7280',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
    textAlign: 'center',
    width: '100%',
  },
  settingsButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  settingsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
  },
  // Welcome Card Stilleri
  welcomeCard: {
    backgroundColor: 'white',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    marginBottom: getResponsiveValue(6, 8, 10, 12),
    textAlign: 'center',
  },
  welcomeText: {
    color: '#6B7280',
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  // Welcome Message Card Stilleri
  welcomeMessageCard: {
    backgroundColor: 'rgba(139, 69, 19, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.15)',
  },
  welcomeMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeMessageText: {
    fontWeight: '600',
    fontFamily: 'System',
    color: '#8B4513',
    flex: 1,
    textAlign: 'center',
  },
  // Uygulama Özellikleri Stilleri
  appFeaturesSection: {
    marginTop: getResponsiveValue(-12, -10, -8, -6),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  appFeaturesTitle: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  featureItemLarge: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  featureLargeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  featureList: {
    marginTop: getResponsiveValue(8, 10, 12, 14),
  },
  featureListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(10, 12, 14, 16),
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  featureListItemText: {
    flex: 1,
    color: '#6B7280',
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  featureIconContainer: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
    flexShrink: 0,
  },
  featureTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    fontWeight: '600',
    fontFamily: 'System',
    color: '#1F2937',
    marginBottom: getResponsiveValue(4, 5, 6, 7),
  },
  featureDescription: {
    fontWeight: '400',
    fontFamily: 'System',
    color: '#6B7280',
    lineHeight: getResponsiveValue(18, 20, 22, 24),
  },
  // Login Button Stilleri
  loginButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  // Çıkış Onay Modalı Stilleri
  logoutModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveValue(20, 24, 28, 32),
  },
  logoutModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  logoutModalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: getResponsiveValue(320, 360, 400, 440),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  logoutModalIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    textAlign: 'center',
  },
  logoutModalMessage: {
    fontWeight: '400',
    fontFamily: 'System',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    lineHeight: getResponsiveValue(22, 24, 26, 28),
  },
  logoutModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  logoutModalCancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontFamily: 'System',
  },
  logoutModalConfirmButton: {
    backgroundColor: '#EF4444',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutModalConfirmText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: 'System',
  },
});

export default SistemAyarlariSidebar;
