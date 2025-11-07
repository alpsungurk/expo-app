import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
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

// Sistem Ayarları Listesi Bileşeni
const SistemAyarlariListesi = () => {
  const { getSistemAyarı } = useAppStore();
  const [activeTab, setActiveTab] = useState('bilgi');
  
  const bilgiAyarlari = [
    { key: 'calisma_saatleri', label: 'Çalışma Saatleri', icon: 'time', value: getSistemAyarı('calisma_saatleri') },
    { key: 'aciklama', label: 'Açıklama', icon: 'information-circle', value: getSistemAyarı('aciklama') },
  ];

  const iletisimAyarlari = [
    { key: 'telefon', label: 'Telefon', icon: 'call', value: getSistemAyarı('telefon'), action: 'call' },
    { key: 'email', label: 'E-posta', icon: 'mail', value: getSistemAyarı('email'), action: 'email' },
    { key: 'adres', label: 'Adres', icon: 'location', value: getSistemAyarı('adres'), action: 'map' },
    { key: 'website', label: 'Website', icon: 'globe', value: getSistemAyarı('website'), action: 'website' },
  ];

  const handleAction = (action, value) => {
    switch (action) {
      case 'call':
        if (value) {
          Linking.openURL(`tel:${value}`);
        }
        break;
      case 'email':
        if (value) {
          Linking.openURL(`mailto:${value}`);
        }
        break;
      case 'map':
        if (value) {
          const encodedAddress = encodeURIComponent(value);
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
        }
        break;
      case 'website':
        if (value) {
          Linking.openURL(value.startsWith('http') ? value : `https://${value}`);
        }
        break;
    }
  };

  const renderAyarItem = (ayar) => (
    <TouchableOpacity
      key={ayar.key}
      style={[
        styles.ayarItem,
        {
          paddingVertical: getResponsiveValue(16, 18, 20, 22),
          paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
          marginBottom: getResponsiveValue(12, 14, 16, 18),
          borderRadius: getResponsiveValue(12, 14, 16, 18),
        }
      ]}
      onPress={() => ayar.action && handleAction(ayar.action, ayar.value)}
      disabled={!ayar.action}
    >
      <View style={styles.ayarHeader}>
        <View style={[
          styles.ayarIcon,
          {
            width: getResponsiveValue(40, 44, 48, 52),
            height: getResponsiveValue(40, 44, 48, 52),
            borderRadius: getResponsiveValue(20, 22, 24, 26),
          }
        ]}>
          <Ionicons 
            name={ayar.icon} 
            size={getResponsiveValue(20, 22, 24, 26)} 
            color="#8B4513" 
          />
        </View>
        <Text style={[
          styles.ayarLabel,
          { fontSize: getResponsiveValue(16, 17, 18, 20) }
        ]}>
          {ayar.label}
        </Text>
        {ayar.action && (
          <Ionicons 
            name="chevron-forward" 
            size={getResponsiveValue(16, 18, 20, 22)} 
            color="#8B4513" 
          />
        )}
      </View>
      
      {ayar.value && (
        <Text style={[
          styles.ayarValue,
          { 
            fontSize: getResponsiveValue(14, 15, 16, 18),
            marginTop: getResponsiveValue(8, 10, 12, 14),
            lineHeight: getResponsiveValue(20, 22, 24, 26),
          }
        ]}>
          {ayar.value}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.ayarlarContainer}>
      {/* Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'bilgi' && styles.activeTab,
            {
              paddingVertical: getResponsiveValue(12, 14, 16, 18),
              paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
              borderRadius: getResponsiveValue(8, 10, 12, 14),
            }
          ]}
          onPress={() => setActiveTab('bilgi')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'bilgi' && styles.activeTabText,
            { fontSize: getResponsiveValue(14, 15, 16, 18) }
          ]}>
            Bilgi
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'iletisim' && styles.activeTab,
            {
              paddingVertical: getResponsiveValue(12, 14, 16, 18),
              paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
              borderRadius: getResponsiveValue(8, 10, 12, 14),
            }
          ]}
          onPress={() => setActiveTab('iletisim')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'iletisim' && styles.activeTabText,
            { fontSize: getResponsiveValue(14, 15, 16, 18) }
          ]}>
            İletişim
          </Text>
        </TouchableOpacity>
      </View>

      {/* İçerik */}
      <View style={styles.tabContent}>
        {activeTab === 'bilgi' && (
          <View>
            {bilgiAyarlari.map(renderAyarItem)}
          </View>
        )}
        
        {activeTab === 'iletisim' && (
          <View>
            {iletisimAyarlari.map(renderAyarItem)}
          </View>
        )}
      </View>
    </View>
  );
};

// Ana Sidebar Component
const SistemAyarlariSidebar = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { getSistemAyarı, user, userProfile } = useAppStore();
  
  const kafeAdi = getSistemAyarı('kafe_adi');
  const isLoggedIn = !!user;

  const handleLoginPress = () => {
    onClose(); // Sidebar'ı kapat
    navigation.navigate('LoginScreen');
  };

  const handleLogoutPress = async () => {
    try {
      await supabase.auth.signOut();
      onClose(); // Sidebar'ı kapat
      showSuccess('Çıkış yapıldı.');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      showError('Çıkış yapılırken bir hata oluştu.');
    }
  };

  const handleSettingsPress = () => {
    onClose(); // Sidebar'ı kapat
    navigation.navigate('SettingsScreen');
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View 
          style={[
            styles.sidebar,
            {
              width: getResponsiveValue(width * 0.85, width * 0.75, width * 0.65, width * 0.55)
            }
          ]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {/* Kafe Adı Header Bar - En Üstte */}
          <View style={styles.kafeAdiHeaderBar}>
            <View style={styles.kafeAdiHeaderContent}>
              <View style={[
                styles.kafeAdiIcon,
                {
                  width: getResponsiveValue(40, 44, 48, 52),
                  height: getResponsiveValue(40, 44, 48, 52),
                  borderRadius: getResponsiveValue(20, 22, 24, 26),
                }
              ]}>
                <Ionicons 
                  name="cafe" 
                  size={getResponsiveValue(22, 24, 26, 28)} 
                  color="#8B4513" 
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
              onPress={onClose}
            >
              <Ionicons name="close" size={getResponsiveValue(18, 20, 22, 24)} color="#8B4513" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarWrapper}>
            <ScrollView 
              style={styles.sidebarContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Profile Card - Giriş yapılmışsa göster */}
              {isLoggedIn && (
                <View style={[
                  styles.profileCard,
                  {
                    padding: getResponsiveValue(16, 18, 20, 22),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                    marginBottom: getResponsiveValue(20, 24, 28, 32),
                  }
                ]}>
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
                  <Text style={[
                    styles.profileName,
                    { fontSize: getResponsiveValue(18, 20, 22, 24) }
                  ]}>
                    {getUserName()}
                  </Text>
                  {userProfile?.roller && (
                    <Text style={[
                      styles.profileRole,
                      { fontSize: getResponsiveValue(14, 15, 16, 18) }
                    ]}>
                      {userProfile.roller?.ad || 'Kullanıcı'}
                    </Text>
                  )}
                </View>
              )}

              <SistemAyarlariListesi />
            </ScrollView>

            {/* Ayarlar Butonu */}
            <View style={styles.settingsButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.settingsButton,
                  {
                    paddingVertical: getResponsiveValue(16, 18, 20, 22),
                    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
                    borderRadius: getResponsiveValue(16, 18, 20, 22),
                  }
                ]}
                onPress={handleSettingsPress}
              >
                <View style={styles.settingsButtonContent}>
                  <Ionicons 
                    name="settings-outline" 
                    size={getResponsiveValue(22, 24, 26, 28)} 
                    color="#8B4513" 
                  />
                  <Text style={[
                    styles.settingsButtonText,
                    { fontSize: getResponsiveValue(16, 17, 18, 20) }
                  ]}>
                    Ayarlar
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Giriş Yap / Çıkış Yap Butonu - En Altta */}
            <View style={styles.loginButtonContainer}>
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
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal ve Sidebar Stilleri
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.6)',
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
    paddingTop: getResponsiveValue(8, 10, 12, 14),
    paddingBottom: getResponsiveValue(100, 110, 120, 130),
  },
  settingsButtonContainer: {
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingTop: getResponsiveValue(16, 18, 20, 22),
    paddingBottom: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingsButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  settingsButtonText: {
    color: '#8B4513',
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  loginButtonContainer: {
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    paddingBottom: getResponsiveValue(24, 28, 32, 36),
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Sistem Ayarları Stilleri
  ayarlarContainer: {
    paddingBottom: getResponsiveValue(20, 24, 28, 32),
  },
  ayarItem: {
    backgroundColor: 'white',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ayarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ayarIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(14, 16, 18, 20),
  },
  ayarLabel: {
    fontWeight: '600',
    fontFamily: 'System',
    color: '#1F2937',
    flex: 1,
    letterSpacing: 0.2,
  },
  ayarValue: {
    color: '#6B7280',
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  
  // Kafe Adı Stilleri
  kafeAdiIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
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
  
  // Sekme Stilleri
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(4, 5, 6, 8),
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    gap: getResponsiveValue(4, 5, 6, 8),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveValue(10, 12, 14, 16),
  },
  activeTab: {
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'System',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: 'System',
  },
  tabContent: {
    flex: 1,
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
  },
  profileRole: {
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
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
});

export default SistemAyarlariSidebar;
