import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';

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

// Sipariş durumları
const ORDER_STATUSES = {
  beklemede: { 
    label: 'Bekliyor', 
    color: '#F59E0B', 
    bgColor: '#FEF3C7'
  },
  hazirlaniyor: { 
    label: 'Hazırlanıyor', 
    color: '#3B82F6', 
    bgColor: '#DBEAFE'
  },
  hazir: { 
    label: 'Hazır', 
    color: '#10B981', 
    bgColor: '#D1FAE5'
  },
  teslim_edildi: { 
    label: 'Teslim Edildi', 
    color: '#059669', 
    bgColor: '#D1FAE5'
  },
  iptal: { 
    label: 'İptal Edildi', 
    color: '#EF4444', 
    bgColor: '#FEE2E2'
  }
};

export default function KasaOrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { masaNo, masaOrders, currentOrder } = route.params;
  const [selectedFilter, setSelectedFilter] = useState('tumu');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localMasaOrders, setLocalMasaOrders] = useState(masaOrders);

  // Filtreleme fonksiyonu
  const filterOrders = () => {
    let filtered = [...localMasaOrders];
    
    if (selectedFilter !== 'tumu') {
      filtered = filtered.filter(order => order.durum === selectedFilter);
    }
    
    setFilteredOrders(filtered);
  };

  // Local masa orders güncellendiğinde filtrele
  React.useEffect(() => {
    filterOrders();
  }, [localMasaOrders, selectedFilter]);

  // Props değiştiğinde local state'i güncelle
  React.useEffect(() => {
    setLocalMasaOrders(masaOrders);
  }, [masaOrders]);

  // Realtime subscription for order updates
  React.useEffect(() => {
    const channel = supabase
      .channel('kasa-order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'siparisler'
        },
        (payload) => {
          console.log('Realtime sipariş güncellemesi:', payload);
          
          // Sadece bu masanın siparişlerini güncelle
          if (payload.new) {
            const updatedOrder = payload.new;
            const masaId = updatedOrder.masa_id;
            
            // Bu masanın siparişlerini kontrol et
            const isThisMasaOrder = localMasaOrders.some(order => order.masa_id === masaId);
            
            if (isThisMasaOrder) {
              console.log('Bu masanın siparişi güncellendi:', updatedOrder);
              
              // Local state'i güncelle
              setLocalMasaOrders(prevOrders => 
                prevOrders.map(order => 
                  order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [localMasaOrders]);

  // Sipariş detaylarını yükle
  const loadOrderDetails = async (orderId) => {
    try {
      const { data: orderDetails, error } = await supabase
        .from(TABLES.SIPARIS_DETAYLARI)
        .select(`
          *,
          urunler (
            id,
            ad,
            fiyat,
            resim_path
          )
        `)
        .eq('siparis_id', orderId);

      if (error) throw error;

      // Local state'i güncelle
      setLocalMasaOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, siparis_detaylari: orderDetails }
            : order
        )
      );
    } catch (error) {
      console.error('Sipariş detayları yüklenirken hata:', error);
    }
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.beklemede;
  };

  const getEmptyIcon = () => {
    switch (selectedFilter) {
      case 'beklemede':
        return 'time-outline';
      case 'hazirlaniyor':
        return 'cafe-outline';
      case 'hazir':
        return 'checkmark-circle-outline';
      case 'teslim_edildi':
        return 'checkmark-done-outline';
      case 'iptal':
        return 'close-circle-outline';
      default:
        return 'receipt-outline';
    }
  };

  const getEmptyMessage = () => {
    switch (selectedFilter) {
      case 'beklemede':
        return 'Beklemede olan sipariş yok';
      case 'hazirlaniyor':
        return 'Hazırlanan sipariş yok';
      case 'hazir':
        return 'Hazır sipariş yok';
      case 'teslim_edildi':
        return 'Teslim edilen sipariş yok';
      case 'iptal':
        return 'İptal edilen sipariş yok';
      default:
        return 'Henüz sipariş yok';
    }
  };

  const getEmptySubtext = () => {
    switch (selectedFilter) {
      case 'beklemede':
        return 'Yeni siparişler geldiğinde burada görünecek';
      case 'hazirlaniyor':
        return 'Siparişler hazırlanmaya başladığında burada görünecek';
      case 'hazir':
        return 'Hazır olan siparişler burada görünecek';
      case 'teslim_edildi':
        return 'Teslim edilen siparişler burada görünecek';
      case 'iptal':
        return 'İptal edilen siparişler burada görünecek';
      default:
        return 'Yeni siparişler geldiğinde burada görünecek';
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

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleFilterPress = (filter) => {
    setSelectedFilter(filter);
  };

  const renderFilterButton = (key, label) => {
    const isActive = selectedFilter === key;
    
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
          {
            paddingVertical: getResponsiveValue(8, 10, 12, 14),
            paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
            borderRadius: getResponsiveValue(8, 10, 12, 14),
          }
        ]}
        onPress={() => handleFilterPress(key)}
      >
        <Text style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive,
          { fontSize: getResponsiveValue(12, 13, 14, 16) }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ durum: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Local state'i hemen güncelle
      setLocalMasaOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, durum: newStatus } : order
        )
      );
      
      // Modal'ı kapat
      handleCloseModal();
      
      console.log(`Sipariş ${orderId} durumu ${newStatus} olarak güncellendi`);
      
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata:', error);
      Alert.alert('Hata', 'Sipariş durumu güncellenemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderOrderCard = (order) => {
    const statusInfo = getStatusInfo(order.durum);
    
    return (
        <TouchableOpacity 
          key={order.id} 
          style={[
            styles.orderCard, 
            { 
              backgroundColor: statusInfo.bgColor,
              borderColor: statusInfo.color + '30',
              borderWidth: 1.5,
            }
          ]}
          onPress={() => handleOrderPress(order)}
        >
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCardTitle}>Sipariş #{order.siparis_no}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.orderCardTime}>{formatTime(order.olusturma_tarihi)}</Text>

        <View style={[styles.orderCardProducts, { backgroundColor: statusInfo.color + '10' }]}>
          {order.siparis_detaylari?.map((item, index) => (
            <Text key={index} style={styles.orderCardProduct}>
              {item.adet} {item.urunler?.ad || 'Ürün'}
            </Text>
          ))}
        </View>

        <Text style={[
          styles.orderCardTotal, 
          { 
            backgroundColor: statusInfo.color + '15'
          }
        ]}>
          Toplam: {formatPrice(order.toplam_tutar)}
        </Text>

        <View style={[styles.orderCardFooter, { borderTopColor: statusInfo.color + '30' }]}>
          <Text style={styles.orderCardTapHint}>
            Detaylar için dokunun
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={getResponsiveValue(16, 18, 20, 22)} 
            color="#374151" 
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
         {masaNo} - Siparişler
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <View style={styles.filterButtons}>
          {renderFilterButton('tumu', 'Tümü')}
          {renderFilterButton('beklemede', 'Beklemede')}
          {renderFilterButton('hazirlaniyor', 'Hazırlanıyor')}
          {renderFilterButton('hazir', 'Hazır')}
          {renderFilterButton('teslim_edildi', 'Teslim Edildi')}
          {renderFilterButton('iptal', 'İptal')}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sipariş Kartları */}
        <View style={styles.ordersContainer}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map(renderOrderCard)
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons 
                  name={getEmptyIcon()} 
                  size={getResponsiveValue(64, 72, 80, 88)} 
                  color="#9CA3AF" 
                />
              </View>
              <Text style={styles.emptyText}>
                {getEmptyMessage()}
              </Text>
              <Text style={styles.emptySubtext}>
                {getEmptySubtext()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sipariş Detay Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleCloseModal}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sipariş Detayı</Text>
            <View style={styles.placeholder} />
          </View>

          {selectedOrder && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Sipariş Bilgileri */}
              <View style={styles.modalOrderInfo}>
                <View style={styles.modalOrderHeader}>
                  <Text style={styles.modalOrderNumber}>#{selectedOrder.siparis_no}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusInfo(selectedOrder.durum).color }]}>
                    <Text style={styles.modalStatusText}>{getStatusInfo(selectedOrder.durum).label}</Text>
                  </View>
                </View>
                
                <Text style={styles.modalOrderTime}>{formatTime(selectedOrder.olusturma_tarihi)}</Text>
                <Text style={styles.modalOrderTable}>Masa {masaNo}</Text>
              </View>

              {/* Ürün Listesi */}
              <View style={styles.modalProductsSection}>
                <Text style={styles.modalSectionTitle}>Sipariş İçeriği</Text>
                {selectedOrder.siparis_detaylari?.map((item, index) => (
                  <View key={index} style={styles.modalProductItem}>
                    <View style={styles.modalProductInfo}>
                      <Text style={styles.modalProductName}>{item.urunler?.ad || 'Ürün'}</Text>
                      <Text style={styles.modalProductQuantity}>x{item.adet}</Text>
                    </View>
                    <Text style={styles.modalProductPrice}>{formatPrice(item.toplam_fiyat)}</Text>
                  </View>
                ))}
              </View>

              {/* Toplam */}
              <View style={styles.modalTotalSection}>
                <Text style={styles.modalTotalText}>Toplam: {formatPrice(selectedOrder.toplam_tutar)}</Text>
              </View>

              {/* Notlar */}
              {selectedOrder.aciklama && (
                <View style={styles.modalNotesSection}>
                  <Text style={styles.modalSectionTitle}>Notlar</Text>
                  <Text style={styles.modalNotesText}>{selectedOrder.aciklama}</Text>
                </View>
              )}

              {/* Durum Güncelleme Butonları */}
              <View style={styles.modalActionsSection}>
                <Text style={styles.modalSectionTitle}>Durum Güncelle</Text>
                <View style={styles.modalActionButtons}>
                  {/* Ana Durum Butonu - Aynı yerde, duruma göre değişiyor */}
                  {selectedOrder.durum === 'beklemede' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'hazirlaniyor')}
                      disabled={isUpdating}
                    >
                      <Ionicons name="play" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Hazırlamaya Başla</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOrder.durum === 'hazirlaniyor' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonSuccess]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'hazir')}
                      disabled={isUpdating}
                    >
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Hazır</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOrder.durum === 'hazir' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonSuccess]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'teslim_edildi')}
                      disabled={isUpdating}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Teslim Edildi</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOrder.durum === 'teslim_edildi' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonSuccess]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'teslim_edildi')}
                      disabled={true}
                    >
                      <Ionicons name="checkmark-done" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Teslim Edildi ✓</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOrder.durum === 'iptal' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonDanger]}
                      onPress={() => {}}
                      disabled={true}
                    >
                      <Ionicons name="close-circle" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>İptal Edildi</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* İptal Butonu - Sadece beklemede ve hazırlanıyor durumlarında */}
                  {(selectedOrder.durum === 'beklemede' || selectedOrder.durum === 'hazirlaniyor') && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonDanger]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'iptal')}
                      disabled={isUpdating}
                    >
                      <Ionicons name="close-circle" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>İptal Et</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
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
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: getResponsiveValue(40, 44, 48, 52),
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  ordersContainer: {
    paddingVertical: getResponsiveValue(16, 20, 24, 28),
    gap: getResponsiveValue(12, 14, 16, 18),
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(20, 22, 24, 26),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  orderCardTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadgeText: {
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  orderCardTime: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  orderCardProducts: {
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: '#F8FAFC',
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    padding: getResponsiveValue(12, 14, 16, 18),
  },
  orderCardProduct: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#475569',
    fontFamily: 'Inter_500Medium',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  orderCardTotal: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    textAlign: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: getResponsiveValue(10, 12, 14, 16),
  },
  filterButton: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: getResponsiveValue(70, 80, 90, 100),
    maxWidth: getResponsiveValue(110, 130, 150, 170),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  filterButtonTextActive: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: getResponsiveValue(8, 10, 12, 14),
    paddingTop: getResponsiveValue(12, 14, 16, 18),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  orderCardTapHint: {
    fontSize: getResponsiveValue(12, 13, 14, 15),
    fontStyle: 'italic',
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: getResponsiveValue(8, 10, 12, 14),
  },
  modalTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter_700Bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  modalOrderInfo: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginVertical: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  modalOrderNumber: {
    fontSize: getResponsiveValue(20, 22, 24, 26),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter_700Bold',
  },
  modalStatusBadge: {
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(16, 18, 20, 22),
  },
  modalStatusText: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  modalOrderTime: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginBottom: getResponsiveValue(4, 5, 6, 8),
  },
  modalOrderTable: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
  },
  modalProductsSection: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter_700Bold',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  modalProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: getResponsiveValue(2, 3, 4, 5),
  },
  modalProductQuantity: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  modalProductPrice: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter_600SemiBold',
  },
  modalTotalSection: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTotalText: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  modalNotesSection: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalNotesText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#374151',
    fontFamily: 'Inter_400Regular',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  modalActionsSection: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalActionButtons: {
    gap: getResponsiveValue(12, 14, 16, 18),
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  modalActionButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  modalActionButtonSuccess: {
    backgroundColor: '#10B981',
  },
  modalActionButtonDanger: {
    backgroundColor: '#EF4444',
  },
  modalActionButtonText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(60, 80, 100, 120),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  emptyIconContainer: {
    width: getResponsiveValue(80, 90, 100, 110),
    height: getResponsiveValue(80, 90, 100, 110),
    borderRadius: getResponsiveValue(40, 45, 50, 55),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveValue(16, 20, 24, 28),
  },
  emptyText: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  emptySubtext: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
});