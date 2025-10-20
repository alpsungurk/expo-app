import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
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
  }
};

export default function OrderStatusScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params || { orderId: null };
  
  const [order, setOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const { currentOrder, setCurrentOrder } = useAppStore();

  useEffect(() => {
    loadOrderData();
    
    // Gerçek zamanlı güncellemeler için subscription
    const subscription = supabase
      .channel('order-updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: TABLES.SIPARISLER,
          filter: `id=eq.${orderId}`
        }, 
        (payload) => {
          console.log('Sipariş güncellendi:', payload);
          setOrder(payload.new);
          setCurrentOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      if (!orderId) {
        Alert.alert('Hata', 'Sipariş ID bulunamadı.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Sipariş bilgilerini yükle
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Sipariş detaylarını yükle
      const { data: orderDetailsData, error: detailsError } = await supabase
        .from(TABLES.SIPARIS_DETAYLARI)
        .select(`
          *,
          urunler (
            ad,
            fiyat,
            resim_path
          )
        `)
        .eq('siparis_id', orderId);

      if (detailsError) throw detailsError;

      setOrder(orderData);
      setOrderDetails(orderDetailsData || []);
      calculateEstimatedTime(orderDetailsData || []);

    } catch (error) {
      console.error('Sipariş verileri yükleme hatası:', error);
      Alert.alert('Hata', 'Sipariş bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateEstimatedTime = (details) => {
    const totalPreparationTime = details.reduce((total, detail) => {
      return total + (detail.urunler?.hazirlanma_suresi || 5) * detail.adet;
    }, 0);
    
    // Ortalama hazırlık süresi + 5 dakika buffer
    const estimatedMinutes = Math.max(totalPreparationTime + 5, 10);
    setEstimatedTime(estimatedMinutes);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrderData();
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

  const renderStatusStep = (status, isActive, isCompleted) => {
    const statusInfo = getStatusInfo(status);
    
    return (
      <View key={status} style={styles.statusStep}>
        <View style={[
          styles.statusIcon,
          isCompleted && { backgroundColor: '#10B981' },
          isActive && { backgroundColor: statusInfo.color },
          !isActive && !isCompleted && { backgroundColor: '#E5E7EB' }
        ]}>
          <Ionicons 
            name={statusInfo.icon} 
            size={20} 
            color={isCompleted || isActive ? 'white' : '#9CA3AF'} 
          />
        </View>
        <View style={styles.statusContent}>
          <Text style={[
            styles.statusLabel,
            isActive && { color: statusInfo.color, fontWeight: 'bold' },
            isCompleted && { color: '#10B981', fontWeight: 'bold' }
          ]}>
            {statusInfo.label}
          </Text>
          {isActive && (
            <Text style={styles.statusDescription}>
              {statusInfo.description}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderOrderItem = (item) => (
    <View key={item.id} style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.urunler?.ad || 'Ürün'}</Text>
        <Text style={styles.itemQuantity}>x{item.adet}</Text>
      </View>
      <Text style={styles.itemPrice}>{formatPrice(item.toplam_fiyat)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} pageName="Sipariş Durumu" />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Sipariş bilgileri yükleniyor...</Text>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} pageName="Sipariş Durumu" />

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Sipariş Bulunamadı</Text>
          <Text style={styles.errorDescription}>
            Sipariş bilgileri yüklenemedi. Lütfen tekrar deneyin.
          </Text>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  const currentStatus = order.durum;
  const statusOrder = ['beklemede', 'hazirlaniyor', 'hazir', 'teslim_edildi'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} pageName="Sipariş Durumu" />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Sipariş Özeti */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.orderNumber}>#{order.siparis_no}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusInfo(currentStatus).color }
            ]}>
              <Text style={styles.statusBadgeText}>
                {getStatusInfo(currentStatus).label}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Sipariş Tarihi: {formatDate(order.olusturma_tarihi)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="restaurant" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Masa: {order.qr_token ? 'QR Masa' : 'Bilinmiyor'}
              </Text>
            </View>
            {estimatedTime && currentStatus !== 'teslim_edildi' && currentStatus !== 'iptal' && (
              <View style={styles.infoRow}>
                <Ionicons name="hourglass" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  Tahmini Süre: {estimatedTime} dakika
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Durum Takibi */}
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Sipariş Durumu</Text>
          {statusOrder.map((status, index) => 
            renderStatusStep(
              status, 
              index === currentIndex,
              index < currentIndex
            )
          )}
        </View>

        {/* Sipariş Detayları */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Sipariş Detayları</Text>
          {orderDetails.map(renderOrderItem)}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Toplam Tutar:</Text>
            <Text style={styles.totalAmount}>{formatPrice(order.toplam_tutar)}</Text>
          </View>
        </View>

        {/* Notlar */}
        {order.notlar && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notesText}>{order.notlar}</Text>
          </View>
        )}

        {/* Aksiyon Butonları */}
        <View style={styles.actionsContainer}>
          {currentStatus === 'hazir' && (
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.actionButtonText}>Siparişi Onayla</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Menü')}
          >
            <Ionicons name="home" size={20} color="#8B4513" />
            <Text style={styles.secondaryButtonText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
});
