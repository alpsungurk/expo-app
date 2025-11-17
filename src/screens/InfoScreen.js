import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  ActivityIndicator,
  BackHandler,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';

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

// Info Card Component
const InfoCard = ({ title, icon, iconColor, bgColor, children }) => {
  return (
    <View style={[
      styles.infoCard,
      {
        marginBottom: getResponsiveValue(16, 18, 20, 22),
        borderRadius: getResponsiveValue(16, 18, 20, 22),
        backgroundColor: bgColor || '#FFFFFF',
      }
    ]}>
      <View style={[
        styles.cardContent,
        {
          padding: getResponsiveValue(20, 22, 24, 26),
        }
      ]}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.cardIconContainer,
            {
              width: getResponsiveValue(48, 52, 56, 60),
              height: getResponsiveValue(48, 52, 56, 60),
              borderRadius: getResponsiveValue(24, 26, 28, 30),
              backgroundColor: iconColor + '15',
            }
          ]}>
            <Ionicons 
              name={icon} 
              size={getResponsiveValue(24, 26, 28, 30)} 
              color={iconColor} 
            />
          </View>
          <Text style={[
            styles.cardTitle,
            { fontSize: getResponsiveValue(18, 20, 22, 24) }
          ]}>
            {title}
          </Text>
        </View>
        <View style={styles.cardBody}>
          {children}
        </View>
      </View>
    </View>
  );
};

// Contact Button Component
const ContactButton = ({ icon, label, value, onPress, iconColor }) => {
  return (
    <TouchableOpacity
      style={[
        styles.contactButton,
        {
          paddingVertical: getResponsiveValue(14, 16, 18, 20),
          paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
          marginBottom: getResponsiveValue(10, 12, 14, 16),
          borderRadius: getResponsiveValue(12, 14, 16, 18),
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contactButtonLeft}>
        <View style={[
          styles.contactIconWrapper,
          {
            width: getResponsiveValue(40, 44, 48, 52),
            height: getResponsiveValue(40, 44, 48, 52),
            borderRadius: getResponsiveValue(20, 22, 24, 26),
            backgroundColor: iconColor + '15',
          }
        ]}>
          <Ionicons 
            name={icon} 
            size={getResponsiveValue(20, 22, 24, 26)} 
            color={iconColor} 
          />
        </View>
        <View style={styles.contactButtonTextContainer}>
          <Text style={[
            styles.contactButtonLabel,
            { fontSize: getResponsiveValue(12, 13, 14, 15) }
          ]}>
            {label}
          </Text>
          <Text 
            style={[
              styles.contactButtonValue,
              { fontSize: getResponsiveValue(14, 15, 16, 17) }
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
        </View>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={getResponsiveValue(18, 20, 22, 24)} 
        color="#9CA3AF" 
      />
    </TouchableOpacity>
  );
};

export default function InfoScreen() {
  const navigation = useNavigation();
  const { getSistemAyarı } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  // Sayfa her açıldığında loading göster
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      // Kısa bir gecikme ile loading'i kapat (smooth transition için)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }, [])
  );

  // Geri tuşu desteği - stack mantığıyla çalışsın
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true; // Event'i handle ettik
    });

    return () => backHandler.remove();
  }, [navigation]);

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

  const kafeAdi = getSistemAyarı('kafe_adi');
  const aciklama = getSistemAyarı('aciklama');
  const telefon = getSistemAyarı('telefon');
  const email = getSistemAyarı('email');
  const adres = getSistemAyarı('adres');
  const website = getSistemAyarı('website');
  const calismaSaatleri = getSistemAyarı('calisma_saatleri');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={getResponsiveValue(22, 24, 26, 28)} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bilgiler</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={[
            styles.loadingText,
            { fontSize: getResponsiveValue(14, 15, 16, 18) }
          ]}>
            Yükleniyor...
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Kafe Adı - Başlık Olarak */}
          {kafeAdi && (
            <View style={styles.kafeAdiContainer}>
              <View style={styles.kafeAdiCard}>
                <View style={styles.kafeAdiIconContainer}>
                  <Image 
                    source={require('../../assets/logo.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[
                  styles.kafeAdiText,
                  { fontSize: getResponsiveValue(24, 26, 28, 30) }
                ]}>
                  {kafeAdi}
                </Text>
              </View>
            </View>
          )}

          {/* Açıklama Kartı */}
          {aciklama && (
            <InfoCard
              title="Açıklama"
              icon="information-circle"
              iconColor="#8B4513"
              bgColor="#FFFFFF"
            >
              <Text style={[
                styles.cardText,
                { fontSize: getResponsiveValue(14, 15, 16, 17) }
              ]}>
                {aciklama}
              </Text>
            </InfoCard>
          )}

          {/* İletişim Bilgileri Kartı */}
          {(telefon || email || adres || website) && (
            <InfoCard
              title="İletişim Bilgileri"
              icon="call"
              iconColor="#8B4513"
              bgColor="#FFFFFF"
            >
              {telefon && (
                <ContactButton
                  icon="call"
                  label="Telefon"
                  value={telefon}
                  onPress={() => handleAction('call', telefon)}
                  iconColor="#8B4513"
                />
              )}

              {email && (
                <ContactButton
                  icon="mail"
                  label="E-posta"
                  value={email}
                  onPress={() => handleAction('email', email)}
                  iconColor="#8B4513"
                />
              )}

              {adres && (
                <ContactButton
                  icon="location"
                  label="Adres"
                  value={adres}
                  onPress={() => handleAction('map', adres)}
                  iconColor="#8B4513"
                />
              )}

              {website && (
                <ContactButton
                  icon="globe"
                  label="Website"
                  value={website}
                  onPress={() => handleAction('website', website)}
                  iconColor="#8B4513"
                />
              )}
            </InfoCard>
          )}

          {/* Çalışma Saatleri Kartı - En Altta */}
          {calismaSaatleri && (
            <InfoCard
              title="Çalışma Saatleri"
              icon="time"
              iconColor="#D2691E"
              bgColor="#FFFFFF"
            >
              <Text style={[
                styles.cardText,
                { fontSize: getResponsiveValue(14, 15, 16, 17) }
              ]}>
                {calismaSaatleri}
              </Text>
            </InfoCard>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: '#FFFFFF',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    paddingTop: getResponsiveValue(16, 18, 20, 22),
    paddingBottom: getResponsiveValue(32, 40, 48, 56),
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
  infoCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  cardIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  cardTitle: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    flex: 1,
  },
  cardBody: {
    marginTop: getResponsiveValue(4, 6, 8, 10),
  },
  cardText: {
    color: '#374151',
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: getResponsiveValue(22, 24, 26, 28),
    textAlign: 'left',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  contactIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  contactButtonTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  contactButtonLabel: {
    fontWeight: '600',
    fontFamily: 'System',
    color: '#6B7280',
    marginBottom: getResponsiveValue(4, 5, 6, 7),
  },
  contactButtonValue: {
    fontWeight: '500',
    fontFamily: 'System',
    color: '#1F2937',
    flexShrink: 1,
  },
  kafeAdiContainer: {
    marginBottom: getResponsiveValue(20, 24, 28, 32),
  },
  kafeAdiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(24, 28, 32, 36),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kafeAdiIconContainer: {
    width: getResponsiveValue(100, 110, 120,130),
    height: getResponsiveValue(100, 110, 120,130),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(16, 18, 20, 22),
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  kafeAdiText: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    flex: 1,
    textAlign: 'left',
  },
});

