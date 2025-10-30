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
  
  const kafeAdi = getSistemAyarı('kafe_adi');
  
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
      {/* Kafe Adı Başlık */}
      <View style={styles.kafeAdiContainer}>
        <View style={[
          styles.kafeAdiIcon,
          {
            width: getResponsiveValue(50, 55, 60, 65),
            height: getResponsiveValue(50, 55, 60, 65),
            borderRadius: getResponsiveValue(25, 27, 30, 32),
          }
        ]}>
          <Ionicons 
            name="cafe" 
            size={getResponsiveValue(28, 30, 32, 34)} 
            color="#8B4513" 
          />
        </View>
        <Text style={[
          styles.kafeAdiText,
          { fontSize: getResponsiveValue(20, 22, 24, 26) }
        ]}>
          {kafeAdi || 'Kafe'}
        </Text>
      </View>

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

  const handleLoginPress = () => {
    onClose(); // Sidebar'ı kapat
    navigation.navigate('LoginScreen');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[
          styles.sidebar,
          {
            width: getResponsiveValue(width * 0.9, width * 0.8, width * 0.7, width * 0.6)
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                width: getResponsiveValue(40, 42, 45, 48),
                height: getResponsiveValue(40, 42, 45, 48),
                borderRadius: getResponsiveValue(20, 21, 22, 24),
              }
            ]}
            onPress={onClose}
          >
            <Ionicons name="close" size={getResponsiveValue(18, 20, 22, 24)} color="#8B4513" />
          </TouchableOpacity>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {/* Giriş Yap Butonu */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  paddingVertical: getResponsiveValue(16, 18, 20, 22),
                  paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                  marginBottom: getResponsiveValue(20, 24, 28, 32),
                  borderRadius: getResponsiveValue(12, 14, 16, 18),
                }
              ]}
              onPress={handleLoginPress}
            >
              <View style={styles.loginButtonContent}>
                <View style={[
                  styles.loginIcon,
                  {
                    width: getResponsiveValue(40, 44, 48, 52),
                    height: getResponsiveValue(40, 44, 48, 52),
                    borderRadius: getResponsiveValue(20, 22, 24, 26),
                  }
                ]}>
                  <Ionicons 
                    name="log-in" 
                    size={getResponsiveValue(20, 22, 24, 26)} 
                    color="white" 
                  />
                </View>
                <Text style={[
                  styles.loginButtonText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Giriş
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={getResponsiveValue(16, 18, 20, 22)} 
                  color="white" 
                />
              </View>
            </TouchableOpacity>

            <SistemAyarlariListesi />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal ve Sidebar Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.6)', // Gri tonları
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: getResponsiveValue(width * 0.8, width * 0.7, width * 0.6, width * 0.5),
    height: '100%',
    backgroundColor: 'white',
    padding: getResponsiveValue(25, 30, 35, 40),
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: getResponsiveValue(40, 45, 50, 55),
    height: getResponsiveValue(40, 45, 50, 55),
    borderRadius: getResponsiveValue(20, 22, 25, 27),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveValue(22, 25, 30, 35),
  },
  sidebarContent: {
    flex: 1,
    paddingTop: getResponsiveValue(10, 12, 14, 16),
  },
  
  // Sistem Ayarları Stilleri
  ayarlarContainer: {
    paddingBottom: getResponsiveValue(20, 24, 28, 32),
  },
  ayarItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ayarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ayarIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  ayarLabel: {
    fontWeight: '600',
    fontFamily: 'System',
    color: '#8B4513',
    flex: 1,
  },
  ayarValue: {
    color: '#6B7280',
    fontWeight: '400',
    fontFamily: 'System',
  },
  
  // Kafe Adı Stilleri
  kafeAdiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveValue(20, 24, 28, 32),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
  },
  kafeAdiIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  kafeAdiText: {
    fontWeight: 'bold',
    fontFamily: 'System',
    color: '#8B4513',
    textAlign: 'center',
  },
  
  // Sekme Stilleri
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(10, 12, 14, 16),
    padding: getResponsiveValue(4, 6, 8, 10),
    marginBottom: getResponsiveValue(20, 24, 28, 32),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    color: '#8B4513',
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
  
  // Login Button Stilleri
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
    justifyContent: 'space-between',
  },
  loginIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
    flex: 1,
  },
});

export default SistemAyarlariSidebar;
