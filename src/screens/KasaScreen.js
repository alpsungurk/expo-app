import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  Animated,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
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

// Sipariş durumları (veritabanı yapısına uygun)
const ORDER_STATUSES = {
  beklemede: { 
    label: 'Bekliyor', 
    color: '#6B7280', 
    bgColor: '#F3F4F6',
    icon: 'hourglass-outline'
  },
  hazirlaniyor: { 
    label: 'Hazırlanıyor', 
    color: '#3B82F6', 
    bgColor: '#DBEAFE',
    icon: 'cafe-outline'
  },
  hazir: { 
    label: 'Hazır', 
    color: '#10B981', 
    bgColor: '#D1FAE5',
    icon: 'checkmark-circle-outline'
  },
  teslim_edildi: { 
    label: 'Teslim Edildi', 
    color: '#059669', 
    bgColor: '#D1FAE5',
    icon: 'checkmark-done-outline'
  },
  iptal: { 
    label: 'İptal Edildi', 
    color: '#EF4444', 
    bgColor: '#FEE2E2',
    icon: 'close-circle-outline'
  }
};

// Renkli kart temaları - Tek renk tonları
const CARD_THEMES = [
  // Mavi tonları
  {
    gradient: ['#3B82F6', '#1D4ED8'],
    accent: '#3B82F6',
    text: '#ffffff',
    shadow: '#3B82F620'
  },
  {
    gradient: ['#60A5FA', '#3B82F6'],
    accent: '#60A5FA',
    text: '#ffffff',
    shadow: '#60A5FA20'
  },
  // Mor tonları
  {
    gradient: ['#8B5CF6', '#7C3AED'],
    accent: '#8B5CF6',
    text: '#ffffff',
    shadow: '#8B5CF620'
  },
  {
    gradient: ['#A78BFA', '#8B5CF6'],
    accent: '#A78BFA',
    text: '#ffffff',
    shadow: '#A78BFA20'
  },
  // Kırmızı tonları
  {
    gradient: ['#EF4444', '#DC2626'],
    accent: '#EF4444',
    text: '#ffffff',
    shadow: '#EF444420'
  },
  {
    gradient: ['#F87171', '#EF4444'],
    accent: '#F87171',
    text: '#ffffff',
    shadow: '#F8717120'
  },
  // Yeşil tonları
  {
    gradient: ['#10B981', '#059669'],
    accent: '#10B981',
    text: '#ffffff',
    shadow: '#10B98120'
  },
  {
    gradient: ['#34D399', '#10B981'],
    accent: '#34D399',
    text: '#ffffff',
    shadow: '#34D39920'
  },
  // Turuncu tonları
  {
    gradient: ['#F59E0B', '#D97706'],
    accent: '#F59E0B',
    text: '#ffffff',
    shadow: '#F59E0B20'
  },
  {
    gradient: ['#FBBF24', '#F59E0B'],
    accent: '#FBBF24',
    text: '#ffffff',
    shadow: '#FBBF2420'
  },
  // Pembe tonları
  {
    gradient: ['#EC4899', '#DB2777'],
    accent: '#EC4899',
    text: '#ffffff',
    shadow: '#EC489920'
  },
  {
    gradient: ['#F472B6', '#EC4899'],
    accent: '#F472B6',
    text: '#ffffff',
    shadow: '#F472B620'
  }
];

export default function KasaScreen() {
  const navigation = useNavigation();
  const { userProfile, setUser, setUserProfile } = useAppStore();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Rol kontrolü - Sadece kasa rolü (id: 3) erişebilir
  useEffect(() => {
    if (userProfile && userProfile.rol_id !== 3) {
      // Kasa rolü değilse ana ekrana yönlendir
      navigation.navigate('MainTabs');
    }
  }, [userProfile, navigation]);

  const loadOrders = React.useCallback(async () => {
    try {
      console.log('KasaScreen: loadOrders başladı');
      const { data: ordersData, error: ordersError } = await supabase
        .from(TABLES.SIPARISLER)
        .select(`
          *,
          masalar (
            masa_no
          ),
          siparis_detaylari (
            id,
            adet,
            birim_fiyat,
            toplam_fiyat,
            ozellestirmeler,
            notlar,
            urunler (
              id,
              ad,
              fiyat,
              resim_path
            )
          )
        `)
        .order('olusturma_tarihi', { ascending: false });

      if (ordersError) {
        console.error('KasaScreen: ordersError:', ordersError);
        throw ordersError;
      }

      console.log('KasaScreen: Siparişler yüklendi, sayı:', ordersData?.length || 0);
      setOrders(ordersData || []);
      
      // Yeni sipariş kontrolü (hazırlanıyor durumundaki son 5 dakikadaki siparişler)
      const newOrders = ordersData?.filter(order => 
        order.durum === 'hazirlaniyor' && 
        new Date(order.olusturma_tarihi) > new Date(Date.now() - 5 * 60 * 1000) // Son 5 dakika
      );
      
      if (newOrders && newOrders.length > 0) {
        setNewOrderNotification(newOrders[0]);
      }

    } catch (error) {
      console.error('KasaScreen: Siparişler yükleme hatası:', error);
      Alert.alert('Hata', 'Siparişler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // filterOrders fonksiyonunu useCallback ile sarmala
  const filterOrders = React.useCallback(() => {
    console.log('KasaScreen: filterOrders çağrılıyor, orders sayısı:', orders.length);
    // Her masadan sadece 1 tane göster (en son sipariş)
    // İptal edilen siparişler de gösterilmeli
    const uniqueMasaOrders = {};
    orders.forEach(order => {
      const masaNo = order.masalar?.masa_no || order.masa_no;
      // Eğer bu masa için henüz sipariş yoksa veya
      // Bu sipariş daha yeni ise veya
      // Mevcut sipariş iptal edilmiş ve bu sipariş iptal edilmemiş ise
      if (!uniqueMasaOrders[masaNo]) {
        uniqueMasaOrders[masaNo] = order;
      } else {
        const existingOrder = uniqueMasaOrders[masaNo];
        const existingDate = new Date(existingOrder.olusturma_tarihi);
        const newDate = new Date(order.olusturma_tarihi);
        
        // Eğer mevcut sipariş iptal edilmiş ve yeni sipariş iptal edilmemiş ise, yeni siparişi göster
        if (existingOrder.durum === 'iptal' && order.durum !== 'iptal') {
          uniqueMasaOrders[masaNo] = order;
        } 
        // Eğer yeni sipariş daha yeni ise, yeni siparişi göster
        else if (newDate > existingDate) {
          uniqueMasaOrders[masaNo] = order;
        }
        // Eğer her ikisi de iptal edilmiş ise, daha yeni olanı göster
        else if (existingOrder.durum === 'iptal' && order.durum === 'iptal' && newDate > existingDate) {
          uniqueMasaOrders[masaNo] = order;
        }
      }
    });
    
    const filtered = Object.values(uniqueMasaOrders);
    console.log('KasaScreen: filterOrders tamamlandı, filtered sayısı:', filtered.length);
    console.log('KasaScreen: Filtrelenmiş siparişler durumları:', filtered.map(o => ({ masa: o.masalar?.masa_no || o.masa_no, durum: o.durum })));
    setFilteredOrders(filtered);
  }, [orders]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  // Realtime subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel('kasa-screen-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'siparisler'
        },
        (payload) => {
          console.log('KasaScreen realtime güncelleme:', payload);
          
          if (payload.new) {
            console.log('Yeni sipariş güncellemesi:', payload.new);
            
            // İptal durumu özel kontrolü
            if (payload.new.durum === 'iptal') {
              console.log('Sipariş iptal edildi:', payload.new);
            }
            
            // loadOrders'ı çağır ve sonucu kontrol et
            console.log('KasaScreen: loadOrders çağrılıyor...');
            loadOrders().then(() => {
              console.log('KasaScreen: loadOrders tamamlandı');
            }).catch((error) => {
              console.error('KasaScreen: loadOrders hatası:', error);
            });
          } else if (payload.old) {
            console.log('Sipariş silindi:', payload.old);
            // loadOrders'ı çağır ve sonucu kontrol et
            console.log('KasaScreen: loadOrders çağrılıyor (silme)...');
            loadOrders().then(() => {
              console.log('KasaScreen: loadOrders tamamlandı (silme)');
            }).catch((error) => {
              console.error('KasaScreen: loadOrders hatası (silme):', error);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order) => {
    const masaNo = order.masalar?.masa_no || order.masa_no;
    
    // Bu masanın tüm siparişlerini bul
    const masaOrders = orders.filter(o => 
      (o.masalar?.masa_no || o.masa_no) === masaNo
    );
    
    navigation.navigate('KasaOrderDetail', { 
      masaNo,
      masaOrders,
      currentOrder: order
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLogout = () => {
    console.log('Çıkış butonuna basıldı!');
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      
      // Çıkış yap - işlemin tamamlanmasını bekle
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Çıkış hatası:', error);
        Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu: ' + error.message);
        return;
      }
      
      // SignOut işleminin tamamlanması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // State'i güncelle
      setUser(null);
      setUserProfile(null);
      
      // Ana ekrana yönlendir
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }, 100);
    } catch (error) {
      console.error('Çıkış hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.yeni_siparis;
  };

  const getOrderSummary = (orderDetails) => {
    if (!orderDetails || orderDetails.length === 0) return 'Ürün yok';
    
    const summary = orderDetails.map(detail => 
      `${detail.adet} ${detail.urunler?.ad || 'Ürün'}`
    ).join(', ');
    
    return summary.length > 50 ? summary.substring(0, 50) + '...' : summary;
  };

  const getMasaOrderStatusSummary = (masaNo) => {
    const masaOrders = orders.filter(order => 
      (order.masalar?.masa_no || order.masa_no) === masaNo
    );
    
    const statusCounts = {};
    masaOrders.forEach(order => {
      const status = order.durum;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const statusLabels = {
      beklemede: 'bekleyen',
      hazirlaniyor: 'hazırlanan',
      hazir: 'hazır',
      teslim_edildi: 'onaylanan',
      iptal: 'iptal'
    };
    
    const summaryParts = [];
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        const label = statusLabels[status] || status;
        summaryParts.push(`${count} ${label}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // Sipariş durumlarını parse et ve ikonlarla göster
  const parseStatusSummary = (statusSummary) => {
    if (!statusSummary || statusSummary === 'Sipariş yok') {
      return [{ text: 'Sipariş yok', icon: 'receipt-outline' }];
    }
    
    const statusMap = {
      'bekleyen': { icon: 'hourglass-outline', text: 'Bekleyen' },
      'hazır': { icon: 'checkmark-circle-outline', text: 'Hazır' },
      'hazırlanan': { icon: 'cafe-outline', text: 'Hazırlanan' },
      'iptal': { icon: 'close-circle-outline', text: 'İptal' },
      'onaylanan': { icon: 'checkmark-outline', text: 'Teslim Edildi' },
      'teslim': { icon: 'checkmark-done-outline', text: 'Teslim' }
    };
    
    return statusSummary.split(', ').map(status => {
      const parts = status.trim().split(' ');
      const count = parts[0];
      const statusKey = parts[1];
      const statusInfo = statusMap[statusKey] || { icon: 'help-outline', text: statusKey };
      
      return {
        text: `${count}x ${statusInfo.text}`,
        icon: statusInfo.icon
      };
    });
  };

  // Durum rengini al (KasaOrderDetailScreen ile aynı)
  const getStatusColor = (statusText) => {
    if (statusText.includes('Bekleyen')) {
      return { color: '#D97706', bgColor: '#FEF3C7' };
    } else if (statusText.includes('Hazırlanan')) {
      return { color: '#3B82F6', bgColor: '#DBEAFE' };
    } else if (statusText.includes('Hazır')) {
      return { color: '#10B981', bgColor: '#D1FAE5' };
    } else if (statusText.includes('İptal')) {
      return { color: '#EF4444', bgColor: '#FEE2E2' };
    } else if (statusText.includes('Teslim Edildi')) {
      return { color: '#8B5CF6', bgColor: '#EDE9FE' };
    } else if (statusText.includes('Teslim')) {
      return { color: '#8B5CF6', bgColor: '#EDE9FE' };
    } else {
      return { color: '#6B7280', bgColor: '#F3F4F6' };
    }
  };

  // Animasyonlu kart komponenti
  const AnimatedCard = ({ item, masaNo, statusInfo, statusSummary, theme, onPress, index }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
      // Kart giriş animasyonu
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          {
            opacity: opacityAnim,
            transform: [
              { translateY: translateYAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.orderCard,
            {
              backgroundColor: theme.gradient[0],
              shadowColor: theme.shadow,
              borderColor: theme.accent,
            }
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          {/* Gradient overlay */}
          <View style={[styles.gradientOverlay, { backgroundColor: theme.gradient[1] }]} />
          
          <View style={styles.orderHeader}>
            <Text style={[styles.orderTableText, { color: theme.text }]}>
              {masaNo}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            {parseStatusSummary(statusSummary).map((status, idx) => {
              const statusColor = getStatusColor(status.text);
              return (
                <View key={idx} style={[styles.statusItem, { backgroundColor: statusColor.bgColor }]}>
                  <Ionicons 
                    name={status.icon} 
                    size={getResponsiveValue(14, 16, 18, 20)} 
                    color={statusColor.color} 
                  />
                  <Text style={[styles.statusText, { color: statusColor.color }]}>
                    {status.text}
                  </Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.orderFooter}>
            <Ionicons 
              name="chevron-forward" 
              size={getResponsiveValue(16, 18, 20, 22)} 
              color={theme.text + '80'} 
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderOrderItem = ({ item, index }) => {
    const statusInfo = getStatusInfo(item.durum);
    const masaNo = item.masalar?.masa_no || item.masa_no;
    const statusSummary = getMasaOrderStatusSummary(masaNo);
    
    // Her kart için farklı tema seç
    const theme = CARD_THEMES[index % CARD_THEMES.length];
    
    return (
      <AnimatedCard
        item={item}
        masaNo={masaNo}
        statusInfo={statusInfo}
        statusSummary={statusSummary}
        theme={theme}
        onPress={() => handleOrderPress(item)}
        index={index}
      />
    );
  };


  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="cafe" size={getResponsiveValue(20, 22, 24, 26)} color="#8B4513" />
          </View>
          <Text style={styles.headerTitle}>Aktif Siparişler</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {userProfile 
                ? `${userProfile.ad || ''} ${userProfile.soyad || ''}`.trim() || 'Kullanıcı'
                : 'Kullanıcı'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={getResponsiveValue(18, 20, 22, 24)} color="#8B4513" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Yeni Sipariş Bildirimi */}
      {newOrderNotification && (
        <View style={styles.notificationCard}>
          <View style={styles.notificationContent}>
            <Ionicons name="notifications" size={20} color="#F59E0B" />
            <Text style={styles.notificationText}>Yeni sipariş geldi</Text>
            <Text style={styles.notificationTable}>{newOrderNotification.masalar?.masa_no || newOrderNotification.masa_no}</Text>
          </View>
          <View style={styles.notificationActions}>
            <Ionicons name="notifications" size={20} color="#F59E0B" />
            <Ionicons name="chevron-forward" size={16} color="#8B4513" />
          </View>
        </View>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Sipariş Listesi */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.ordersList,
          filteredOrders.length === 0 && { flexGrow: 1 }
        ]}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={false}
        nestedScrollEnabled={true}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={getResponsiveValue(64, 72, 80, 88)} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyText}>
              Henüz sipariş yok
            </Text>
            <Text style={styles.emptySubtext}>
              Yeni siparişler geldiğinde burada görünecek
            </Text>
          </View>
        }
      />

      {/* Çıkış Onay Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalContent}>
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#8B4513" />
              <Text style={styles.logoutModalTitle}>Çıkış Yap</Text>
            </View>
            
            <Text style={styles.logoutModalDescription}>
              Sistemden çıkmak istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                onPress={handleCancelLogout}
              >
                <Text style={styles.logoutModalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutModalConfirmText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  spacer: {
    height: getResponsiveValue(8, 10, 12, 14),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  headerIconContainer: {
    width: getResponsiveValue(36, 40, 44, 48),
    height: getResponsiveValue(36, 40, 44, 48),
    borderRadius: getResponsiveValue(18, 20, 22, 24),
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(12, 14, 16, 18),
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  userRole: {
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '500',
    color: '#8B4513',
    fontFamily: 'System',
  },
  logoutButton: {
    width: getResponsiveValue(44, 48, 52, 56),
    height: getResponsiveValue(44, 48, 52, 56),
    borderRadius: getResponsiveValue(22, 24, 26, 28),
    backgroundColor: 'rgba(139, 69, 19, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.3)',
  },
  notificationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
    marginVertical: getResponsiveValue(12, 16, 20, 24),
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
    flex: 1,
  },
  notificationText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#92400E',
    fontFamily: 'System',
  },
  notificationTable: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    color: '#A16207',
    fontFamily: 'System',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  ordersList: {
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingBottom: getResponsiveValue(100, 120, 140, 160),
    paddingTop: getResponsiveValue(8, 10, 12, 14),
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    padding: getResponsiveValue(20, 22, 24, 26),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    borderRadius: getResponsiveValue(20, 22, 24, 26),
  },
  orderHeader: {
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    alignItems: 'center',
  },
  orderTableText: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'System',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    justifyContent: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: getResponsiveValue(8, 10, 12, 14),
    marginBottom: getResponsiveValue(4, 6, 8, 10),
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 6, 8, 10),
    borderRadius: getResponsiveValue(12, 14, 16, 18),
  },
  statusText: {
    fontSize: getResponsiveValue(12, 13, 14, 15),
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: getResponsiveValue(4, 6, 8, 10),
  },
  statusBadge: {
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
  },
  statusBadgeText: {
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '700',
    color: 'white',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  orderSummary: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    fontFamily: 'System',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  orderTime: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    color: '#9CA3AF',
    fontFamily: 'System',
    fontWeight: '500',
  },
  orderStatusSummary: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    color: '#6B7280',
    fontFamily: 'System',
    fontWeight: '500',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    lineHeight: getResponsiveValue(18, 20, 22, 24),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(60, 80, 100, 120),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  emptyIconContainer: {
    width: getResponsiveValue(120, 140, 160, 180),
    height: getResponsiveValue(120, 140, 160, 180),
    borderRadius: getResponsiveValue(60, 70, 80, 90),
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, 24, 28, 32),
  },
  emptyText: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#374151',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
    marginBottom: getResponsiveValue(20, 24, 28, 32),
    fontFamily: 'System',
  },
  clearFilterButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearFilterButtonText: {
    color: 'white',
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    fontFamily: 'System',
  },
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  logoutModalContent: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(24, 28, 32, 36),
    width: '100%',
    maxWidth: getResponsiveValue(320, 360, 400, 440),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutModalHeader: {
    alignItems: 'center',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  logoutModalTitle: {
    fontSize: getResponsiveValue(20, 22, 24, 26),
    fontWeight: '700',
    color: '#1F2937',
    marginTop: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  logoutModalDescription: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: getResponsiveValue(22, 24, 26, 28),
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    fontFamily: 'System',
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: getResponsiveValue(12, 14, 16, 18),
  },
  logoutModalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    alignItems: 'center',
  },
  logoutModalCancelText: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'System',
  },
  logoutModalConfirmButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    alignItems: 'center',
  },
  logoutModalConfirmText: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'System',
  },
});
