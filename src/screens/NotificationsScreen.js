import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animasyon fonksiyonları
  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Geri buton handler
  const handleGoBack = () => {
    slideOut();
  };

  // Component mount olduğunda animasyonu başlat
  useEffect(() => {
    slideIn();
    fetchNotifications();
  }, []);

  // Bildirimleri getir
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bildirimler')
        .select('*')
        .eq('aktif', true)
        .order('olusturma_tarihi', { ascending: false });

      if (error) {
        console.error('Bildirimler yüklenirken hata:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // Tarih formatla
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Az önce';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else if (diffInHours < 48) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  // Bildirim tipine göre ikon
  const getNotificationIcon = (tip) => {
    switch (tip) {
      case 'kampanya':
        return 'megaphone';
      case 'siparis':
        return 'receipt';
      case 'sistem':
        return 'settings';
      case 'promosyon':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  // Bildirim tipine göre renk
  const getNotificationColor = (tip) => {
    switch (tip) {
      case 'kampanya':
        return '#F59E0B';
      case 'siparis':
        return '#3B82F6';
      case 'sistem':
        return '#6B7280';
      case 'promosyon':
        return '#10B981';
      default:
        return '#8B4513';
    }
  };

  const renderNotification = (notification) => (
    <View key={notification.id} style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(notification.tip) + '20' }
        ]}>
          <Ionicons 
            name={getNotificationIcon(notification.tip)} 
            size={20} 
            color={getNotificationColor(notification.tip)} 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.baslik}</Text>
          <Text style={styles.notificationTime}>
            {formatDate(notification.olusturma_tarihi)}
          </Text>
        </View>
      </View>
      <Text style={styles.notificationText}>{notification.icerik}</Text>
    </View>
  );

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Dimensions.get('window').height],
              }),
            },
          ],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="notifications" size={40} color="#8B4513" />
            <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptyText}>
              Yeni kampanyalar ve güncellemeler burada görünecek
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'System',
  },
  notificationsList: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: 'System',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'System',
  },
  notificationText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontFamily: 'System',
  },
});

export default NotificationsScreen;
