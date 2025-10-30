import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

export default function KasaScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders]);

  const loadOrders = async () => {
    try {
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

      if (ordersError) throw ordersError;

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
      console.error('Siparişler yükleme hatası:', error);
      Alert.alert('Hata', 'Siparişler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    // Her masadan sadece 1 tane göster (en son sipariş)
    const uniqueMasaOrders = {};
    orders.forEach(order => {
      const masaNo = order.masalar?.masa_no || order.masa_no;
      if (!uniqueMasaOrders[masaNo] || 
          new Date(order.olusturma_tarihi) > new Date(uniqueMasaOrders[masaNo].olusturma_tarihi)) {
        uniqueMasaOrders[masaNo] = order;
      }
    });
    
    setFilteredOrders(Object.values(uniqueMasaOrders));
  };

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

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    navigation.navigate('MainTabs');
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

  const renderOrderItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.durum);
    const masaNo = item.masalar?.masa_no || item.masa_no;
    const statusSummary = getMasaOrderStatusSummary(masaNo);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderTableText}> {masaNo}</Text>
        </View>
        
        <Text style={styles.orderStatusSummary}>
          {statusSummary || 'Sipariş yok'}
        </Text>
        
        <View style={styles.orderFooter}>
          <Text style={styles.orderTime}>{formatTime(item.olusturma_tarihi)}</Text>
          <Ionicons 
            name="chevron-forward" 
            size={getResponsiveValue(16, 18, 20, 22)} 
            color="#9CA3AF" 
          />
        </View>
      </TouchableOpacity>
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
            <Text style={styles.userName}>Ahmet Y.</Text>
            <Text style={styles.userRole}>Yönetici</Text>
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
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
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
    paddingBottom: getResponsiveValue(20, 24, 28, 32),
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(20, 22, 24, 26),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  orderTableText: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'System',
    letterSpacing: 0.5,
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
    justifyContent: 'space-between',
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
