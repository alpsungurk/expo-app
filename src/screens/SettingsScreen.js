import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../config/supabase';

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

const SETTINGS_KEYS = {
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
};

const AUTH_KEYS = {
  IS_LOGGED_IN: 'is_logged_in',
  USERNAME: 'username',
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { expoPushToken } = useNotification();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [aboutExpanded, setAboutExpanded] = useState(true); // Hakkında varsayılan olarak açık
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [expoPushToken]);

  const loadSettings = async () => {
    try {
      const [notifications, loggedIn, user] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN),
        AsyncStorage.getItem(AUTH_KEYS.USERNAME),
      ]);

      const notificationsEnabledValue = notifications !== 'false';
      setNotificationsEnabled(notificationsEnabledValue);
      setIsLoggedIn(loggedIn === 'true');
      setUsername(user || '');

      // Supabase'deki token durumunu senkronize et
      if (expoPushToken) {
        const { error } = await supabase
          .from('push_tokens')
          .update({ is_active: notificationsEnabledValue })
          .eq('push_token', expoPushToken);
        
        if (error) {
          console.error('Token durumu senkronizasyon hatası:', error);
        } else {
          console.log('Token durumu senkronize edildi:', notificationsEnabledValue);
        }
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Ayar kaydedilirken hata:', error);
      Alert.alert('Hata', 'Ayar kaydedilemedi.');
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    await saveSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, value);

    if (value) {
      // Bildirimleri aç
      // 1. Bildirim izni kontrol et
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Bildirim İzni',
            'Bildirimleri açmak için izin gereklidir. Lütfen ayarlardan izin verin.',
            [{ text: 'Tamam' }]
          );
          setNotificationsEnabled(false);
          await saveSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, false);
          return;
        }
      }
      
      // 2. Supabase'de token'ı aktif yap
      if (expoPushToken) {
        const { error } = await supabase
          .from('push_tokens')
          .update({ is_active: true })
          .eq('push_token', expoPushToken);
        
        if (error) {
          console.error('Token aktif yapma hatası:', error);
        } else {
          console.log('Push token aktif yapıldı');
        }
      }
      
      // 3. Notification handler'ı aktif yap
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } else {
      // Bildirimleri kapat
      // 1. Supabase'de token'ı pasif yap (ÖNEMLİ!)
      if (expoPushToken) {
        const { error } = await supabase
          .from('push_tokens')
          .update({ is_active: false })
          .eq('push_token', expoPushToken);
        
        if (error) {
          console.error('Token pasif yapma hatası:', error);
        } else {
          console.log('Push token pasif yapıldı');
        }
      }
      
      // 2. Notification handler'ı pasif yap
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
  };


  const handleBackPress = () => {
    navigation.goBack();
  };


  const handleAccountInfoPress = () => {
    Alert.alert(
      'Hesap Bilgileri',
      `Kullanıcı Adı: ${username}\n\n` +
      'Hesap ayarlarınızı buradan görüntüleyebilir ve yönetebilirsiniz.',
      [{ text: 'Tamam' }]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                AUTH_KEYS.IS_LOGGED_IN,
                AUTH_KEYS.USERNAME,
              ]);
              setIsLoggedIn(false);
              setUsername('');
              Alert.alert('Başarılı', 'Çıkış yapıldı.');
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleAboutToggle = () => {
    setAboutExpanded(!aboutExpanded);
  };

  const handlePrivacyToggle = () => {
    setPrivacyExpanded(!privacyExpanded);
  };

  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onValueChange, 
    disabled = false 
  }) => (
    <View style={[
      styles.settingItem,
      dynamicStyles.settingItem,
      {
        paddingVertical: getResponsiveValue(16, 18, 20, 22),
        paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
        marginBottom: getResponsiveValue(12, 14, 16, 18),
        borderRadius: getResponsiveValue(12, 14, 16, 18),
      }
    ]}>
      <View style={styles.settingItemLeft}>
        <View style={[
          styles.settingIcon,
          {
            width: getResponsiveValue(40, 44, 48, 52),
            height: getResponsiveValue(40, 44, 48, 52),
            borderRadius: getResponsiveValue(20, 22, 24, 26),
          }
        ]}>
          <Ionicons 
            name={icon} 
            size={getResponsiveValue(20, 22, 24, 26)} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[
            styles.settingTitle,
            dynamicStyles.settingTitle,
            { fontSize: getResponsiveValue(16, 17, 18, 20) }
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[
              styles.settingDescription,
              dynamicStyles.settingDescription,
              { fontSize: getResponsiveValue(13, 14, 15, 16) }
            ]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: `${colors.primary}30` }}
        thumbColor={value ? colors.primary : colors.textSecondary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );

  const AccordionItem = ({ icon, title, expanded, onToggle, content }) => (
    <View style={[
      styles.accordionItem,
      dynamicStyles.infoItem,
      {
        marginBottom: getResponsiveValue(12, 14, 16, 18),
        borderRadius: getResponsiveValue(12, 14, 16, 18),
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.accordionHeader,
          {
            paddingVertical: getResponsiveValue(16, 18, 20, 22),
            paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
          }
        ]}
        onPress={onToggle}
      >
        <View style={styles.settingItemLeft}>
          <View style={[
            styles.settingIcon,
            {
              width: getResponsiveValue(40, 44, 48, 52),
              height: getResponsiveValue(40, 44, 48, 52),
              borderRadius: getResponsiveValue(20, 22, 24, 26),
            }
          ]}>
            <Ionicons 
              name={icon} 
              size={getResponsiveValue(20, 22, 24, 26)} 
              color={colors.primary} 
            />
          </View>
          <Text style={[
            styles.settingTitle,
            dynamicStyles.settingTitle,
            { fontSize: getResponsiveValue(16, 17, 18, 20) }
          ]}>
            {title}
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={getResponsiveValue(20, 22, 24, 26)} 
          color={colors.primary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={[
          styles.accordionContent,
          {
            paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
            paddingBottom: getResponsiveValue(16, 18, 20, 22),
          }
        ]}>
          <Text style={[
            styles.accordionText,
            dynamicStyles.settingDescription,
            { fontSize: getResponsiveValue(14, 15, 16, 18) }
          ]}>
            {content}
          </Text>
        </View>
      )}
    </View>
  );

  const InfoItem = ({ icon, title, onPress }) => (
    <TouchableOpacity
      style={[
        styles.infoItem,
        dynamicStyles.infoItem,
        {
          paddingVertical: getResponsiveValue(16, 18, 20, 22),
          paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
          marginBottom: getResponsiveValue(12, 14, 16, 18),
          borderRadius: getResponsiveValue(12, 14, 16, 18),
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.settingItemLeft}>
        <View style={[
          styles.settingIcon,
          {
            width: getResponsiveValue(40, 44, 48, 52),
            height: getResponsiveValue(40, 44, 48, 52),
            borderRadius: getResponsiveValue(20, 22, 24, 26),
          }
        ]}>
          <Ionicons 
            name={icon} 
            size={getResponsiveValue(20, 22, 24, 26)} 
            color={colors.primary} 
          />
        </View>
        <Text style={[
          styles.settingTitle,
          dynamicStyles.settingTitle,
          { fontSize: getResponsiveValue(16, 17, 18, 20) }
        ]}>
          {title}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={getResponsiveValue(20, 22, 24, 26)} 
        color={colors.primary} 
      />
    </TouchableOpacity>
  );

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.surface, borderBottomColor: colors.border },
    headerTitle: { color: colors.text },
    settingItem: { backgroundColor: colors.surface },
    settingTitle: { color: colors.text },
    settingDescription: { color: colors.textSecondary },
    infoItem: { backgroundColor: colors.surface },
    logoutButton: { backgroundColor: colors.surface, borderColor: colors.border },
    loadingText: { color: colors.textSecondary },
  };

  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Ayarlar</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Ayarlar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SettingItem
          icon="notifications-outline"
          title="Bildirimler"
          description="Push bildirimlerini aç veya kapat"
          value={notificationsEnabled}
          onValueChange={handleNotificationsToggle}
        />

        {isLoggedIn && (
          <>
            <InfoItem
              icon="person-outline"
              title="Hesap Bilgileri"
              onPress={handleAccountInfoPress}
            />

            <TouchableOpacity
              style={[
                styles.logoutButton,
                dynamicStyles.logoutButton,
                {
                  paddingVertical: getResponsiveValue(16, 18, 20, 22),
                  paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
                  marginBottom: getResponsiveValue(12, 14, 16, 18),
                  borderRadius: getResponsiveValue(12, 14, 16, 18),
                }
              ]}
              onPress={handleLogoutPress}
            >
              <View style={styles.logoutButtonContent}>
                <Ionicons 
                  name="log-out-outline" 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="#EF4444" 
                />
                <Text style={[
                  styles.logoutButtonText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Çıkış Yap
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <AccordionItem
          icon="information-circle-outline"
          title="Hakkında"
          expanded={aboutExpanded}
          onToggle={handleAboutToggle}
          content={`Sipariş Sistemi\n\nVersiyon: ${Constants.expoConfig?.version || '1.0.0'}\n\nModern ve kullanıcı dostu sipariş yönetim sistemi.`}
        />

        <AccordionItem
          icon="shield-checkmark-outline"
          title="Gizlilik Politikası"
          expanded={privacyExpanded}
          onToggle={handlePrivacyToggle}
          content={`Gizlilik Politikamız\n\n1. Veri Toplama\nUygulamamız, sipariş vermeniz ve hizmetlerimizden yararlanmanız için gerekli olan minimum düzeyde kişisel bilgi toplar.\n\n2. Veri Kullanımı\nToplanan bilgiler sadece sipariş işlemlerinizi gerçekleştirmek ve size hizmet sunmak amacıyla kullanılır.\n\n3. Veri Güvenliği\nKişisel bilgileriniz güvenli bir şekilde saklanır ve üçüncü taraflarla paylaşılmaz.\n\n4. Çerezler\nUygulamamız, deneyiminizi iyileştirmek için çerezler kullanabilir.\n\n5. Değişiklikler\nBu politika zaman zaman güncellenebilir. Güncellemeler uygulama içinde bildirilir.`}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    borderBottomWidth: 1,
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
    fontFamily: 'System',
  },
  placeholder: {
    width: getResponsiveValue(40, 44, 48, 52),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveValue(20, 24, 28, 32),
    paddingBottom: getResponsiveValue(40, 48, 56, 64),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(14, 16, 18, 20),
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
  },
  settingDescription: {
    fontFamily: 'System',
    lineHeight: getResponsiveValue(18, 20, 22, 24),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accordionItem: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionContent: {
    paddingTop: getResponsiveValue(8, 10, 12, 14),
  },
  accordionText: {
    fontFamily: 'System',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontFamily: 'System',
  },
  logoutButton: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  logoutButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontFamily: 'System',
  },
});

