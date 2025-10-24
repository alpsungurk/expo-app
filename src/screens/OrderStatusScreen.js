import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

const ORDER_STATUSES = {
  beklemede: { 
    label: 'Beklemede', 
    color: '#F59E0B', 
    icon: 'time-outline',
    description: 'Siparişiniz alındı ve hazırlanmaya başlanacak'
  },
  hazirlaniyor: { 
    label: 'Hazırlanıyor', 
    color: '#3B82F6', 
    icon: 'cafe-outline',
    description: 'Siparişiniz hazırlanıyor, lütfen bekleyin'
  },
  hazir: { 
    label: 'Hazır', 
    color: '#10B981', 
    icon: 'checkmark-circle-outline',
    description: 'Siparişiniz hazır! Masanıza getirilecek'
  },
  teslim_edildi: { 
    label: 'Teslim Edildi', 
    color: '#059669', 
    icon: 'checkmark-done-outline',
    description: 'Siparişiniz teslim edildi. Afiyet olsun!'
  },
  iptal: { 
    label: 'İptal Edildi', 
    color: '#EF4444', 
    icon: 'close-circle-outline',
    description: 'Siparişiniz iptal edildi'
  },
  siparis_yok: { 
    label: 'Sipariş Yok', 
    color: '#6B7280', 
    icon: 'document-outline',
    description: 'Henüz bir siparişiniz bulunmuyor'
  }
};

export default function OrderStatusScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Aktif sipariş sayısını hesapla (beklemede, hazırlanıyor, hazır)
  const getActiveOrdersCount = () => {
    return orders.filter(order => 
      ['beklemede', 'hazirlaniyor', 'hazir'].includes(order.durum)
    ).length;
  };
  const [phoneToken, setPhoneToken] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { currentOrder, setCurrentOrder, activeOrder, setActiveOrder, setAllOrders } = useAppStore();

  // Phone token'ı al
  useEffect(() => {
    const getPhoneToken = async () => {
      try {
        const token = await AsyncStorage.getItem('phoneToken');
        console.log('Phone Token:', token);
        setPhoneToken(token);
      } catch (error) {
        console.error('Phone token alma hatası:', error);
      }
    };
    getPhoneToken();
  }, []);

  useEffect(() => {
    if (phoneToken) {
      loadOrdersData();
      
      // Gerçek zamanlı güncellemeler için subscription
      const subscription = supabase
        .channel('orders-updates')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: TABLES.SIPARISLER
          }, 
          (payload) => {
            loadOrdersData();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [phoneToken]);

  // Sayfa açılış animasyonu
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Sayfa her açıldığında verileri yenile
  useFocusEffect(
    useCallback(() => {
      if (phoneToken) {
        loadOrdersData();
      }
    }, [phoneToken])
  );

  const loadOrdersData = async () => {
    try {
      if (!phoneToken) {
        console.log('Phone token bulunamadı, siparişler yüklenemiyor');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.log('Siparişler yükleniyor, token:', phoneToken);

      // Telefon token'a göre tüm siparişleri yükle
      const { data: ordersData, error: ordersError } = await supabase
        .from(TABLES.SIPARISLER)
        .select(`
          *,
          siparis_detaylari (
            id,
            adet,
            toplam_fiyat,
            urunler (
              ad,
              fiyat
            )
          )
        `)
        .eq('telefon_token', phoneToken)
        .order('olusturma_tarihi', { ascending: false });

      if (ordersError) throw ordersError;

      console.log('Bulunan sipariş sayısı:', ordersData?.length || 0);
      console.log('Siparişler:', ordersData);

      setOrders(ordersData || []);
      
      // Tüm siparişleri AppStore'a kaydet
      setAllOrders(ordersData || []);

      // Aktif siparişi güncelle (beklemede, hazırlanıyor veya hazır olan ilk sipariş)
      const activeOrderData = ordersData?.find(o => 
        ['beklemede', 'hazirlaniyor', 'hazir'].includes(o.durum)
      );
      
      if (activeOrderData) {
        console.log('Aktif sipariş bulundu:', activeOrderData.siparis_no);
        setActiveOrder(activeOrderData);
      } else {
        console.log('Aktif sipariş bulunamadı');
        setActiveOrder(null);
      }

    } catch (error) {
      console.error('Siparişler yükleme hatası:', error);
      Alert.alert('Hata', 'Siparişler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateEstimatedTime = (orderDetails) => {
    const totalPreparationTime = orderDetails.reduce((total, detail) => {
      return total + (detail.urunler?.hazirlanma_suresi || 5) * detail.adet;
    }, 0);
    
    // Ortalama hazırlık süresi + 5 dakika buffer
    return Math.max(totalPreparationTime + 5, 10);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrdersData();
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.beklemede;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  // Sipariş kartı render fonksiyonu
  const renderOrderCard = (order) => {
    const statusInfo = getStatusInfo(order.durum);
    const itemCount = order.siparis_detaylari?.length || 0;
    const estimatedTime = calculateEstimatedTime(order.siparis_detaylari || []);

    return (
      <TouchableOpacity 
        key={order.id}
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { 
          order, 
          orderDetails: order.siparis_detaylari 
        })}
        activeOpacity={0.7}
      >
        {/* Üst Kısım - Sipariş No ve Durum */}
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardLeft}>
            <Ionicons 
              name={statusInfo.icon} 
              size={24} 
              color={statusInfo.color} 
            />
            <View style={styles.orderCardInfo}>
              <Text style={styles.orderCardNumber}>#{order.siparis_no}</Text>
              <Text style={styles.orderCardDate}>{formatDate(order.olusturma_tarihi)}</Text>
            </View>
          </View>
          
          <View style={[
            styles.orderCardBadge,
            { backgroundColor: statusInfo.color }
          ]}>
            <Text style={styles.orderCardBadgeText}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Orta Kısım - Ürün Sayısı ve Tutar */}
        <View style={styles.orderCardBody}>
          <View style={styles.orderCardDetail}>
            <Ionicons name="fast-food-outline" size={16} color="#6B7280" />
            <Text style={styles.orderCardDetailText}>{itemCount} ürün</Text>
          </View>
          
          {['beklemede', 'hazirlaniyor'].includes(order.durum) && (
            <View style={styles.orderCardDetail}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.orderCardDetailText}>~{estimatedTime} dk</Text>
            </View>
          )}
          
          <View style={styles.orderCardDetail}>
            <Text style={styles.orderCardPrice}>{formatPrice(order.toplam_tutar)}</Text>
          </View>
        </View>

        {/* Alt Kısım - Durum Açıklaması */}
        <View style={styles.orderCardFooter}>
          <Text style={[styles.orderCardDescription, { color: statusInfo.color }]}>
            {statusInfo.description}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  // Sipariş yoksa
  if (!isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={80} color="#6B7280" />
          <Text style={styles.emptyTitle}>Sipariş Yok</Text>
          <Text style={styles.emptyDescription}>
            Henüz bir siparişiniz bulunmuyor. Yeni sipariş vermek için menüye göz atabilirsiniz.
          </Text>
          <TouchableOpacity 
            style={styles.backToMenuButton}
            onPress={() => navigation.navigate('Menü')}
          >
            <Text style={styles.backToMenuButtonText}>Menüye Dön</Text>
          </TouchableOpacity>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  // Ana sipariş listesi ekranı
  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <Animated.ScrollView 
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Aktif Sipariş Durumu Göstergesi - Kaldırıldı */}

        {/* Siparişlerim Başlığı */}
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>Siparişlerim</Text>
          <Text style={styles.ordersCount}>{orders.length} sipariş</Text>
        </View>

        {/* Sipariş Listesi */}
        <View style={styles.ordersContainer}>
          {orders.map(renderOrderCard)}
        </View>

        {/* Alt Boşluk */}
        <View style={{ height: 20 }} />
      </Animated.ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moreItemsText: {
    fontSize: 14,
    color: '#8B4513',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: 'System',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  notesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notesText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  secondaryButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backToMenuButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backToMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Sipariş Durumu Göstergesi
  orderStatusContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  orderStatusCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  orderStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  orderStatusTextContainer: {
    flex: 1,
  },
  orderStatusTitle: {
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 4,
  },
  orderStatusSubtitle: {
    fontWeight: '500',
    fontFamily: 'System',
    opacity: 0.8,
  },
  // Sipariş Listesi Stilleri
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
  },
  ordersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'System',
  },
  ordersCount: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderCardInfo: {
    gap: 4,
  },
  orderCardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'System',
  },
  orderCardDate: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderCardBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'System',
  },
  orderCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderCardDetailText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    fontFamily: 'System',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderCardDescription: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backToMenuButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backToMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
