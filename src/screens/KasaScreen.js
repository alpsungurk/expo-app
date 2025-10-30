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
  RefreshControl
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
  const [selectedFilter, setSelectedFilter] = useState('tumu');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedFilter]);

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
    let filtered = [...orders];
    
    if (selectedFilter !== 'tumu') {
      filtered = filtered.filter(order => order.durum === selectedFilter);
    }
    
    setFilteredOrders(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order) => {
    navigation.navigate('KasaOrderDetail', { 
      order, 
      orderDetails: order.siparis_detaylari 
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Kasa sisteminden çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', onPress: () => navigation.goBack() }
      ]
    );
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

  const renderOrderItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.durum);
    
    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          { backgroundColor: statusInfo.bgColor }
        ]}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderTableText}>Masa {item.masalar?.masa_no || item.masa_no}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.color }
          ]}>
            <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
          </View>
        </View>
        
        <Text style={[
          styles.orderSummary,
          { color: statusInfo.color }
        ]}>
          {getOrderSummary(item.siparis_detaylari)}
        </Text>
        
        <View style={styles.orderFooter}>
          <Text style={styles.orderTime}>{formatTime(item.olusturma_tarihi)}</Text>
          <TouchableOpacity style={styles.detailButton}>
            <Text style={styles.detailButtonText}>Detaya Git</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
        onPress={() => setSelectedFilter(key)}
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
            <Text style={styles.userRole}>Kasa</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={getResponsiveValue(18, 20, 22, 24)} color="#8B4513" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Yeni Sipariş Bildirimi */}
      {newOrderNotification && (
        <View style={styles.notificationCard}>
          <View style={styles.notificationContent}>
            <Ionicons name="notifications" size={20} color="#F59E0B" />
            <Text style={styles.notificationText}>Yeni sipariş geldi</Text>
            <Text style={styles.notificationTable}>Masa {newOrderNotification.masalar?.masa_no || newOrderNotification.masa_no}</Text>
          </View>
          <View style={styles.notificationActions}>
            <Ionicons name="notifications" size={20} color="#F59E0B" />
            <Ionicons name="chevron-forward" size={16} color="#8B4513" />
          </View>
        </View>
      )}

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
              {selectedFilter === 'tumu' 
                ? 'Henüz sipariş yok' 
                : 'Bu durumda sipariş yok'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'tumu' 
                ? 'Yeni siparişler geldiğinde burada görünecek' 
                : 'Farklı bir durum seçerek arama yapabilirsiniz'
              }
            </Text>
            {selectedFilter !== 'tumu' && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => setSelectedFilter('tumu')}
              >
                <Text style={styles.clearFilterButtonText}>Tüm Siparişleri Görüntüle</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filtre Butonları */}
      <View style={styles.filterContainer}>
        <View style={styles.filterButtons}>
          {renderFilterButton('tumu', 'Tümü')}
          {renderFilterButton('beklemede', 'Bekle')}
          {renderFilterButton('hazirlaniyor', 'Hazırla')}
          {renderFilterButton('hazir', 'Hazır')}
          {renderFilterButton('teslim_edildi', 'Teslim')}
          {renderFilterButton('iptal', 'İptal')}
        </View>
      </View>
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
    width: getResponsiveValue(36, 40, 44, 48),
    height: getResponsiveValue(36, 40, 44, 48),
    borderRadius: getResponsiveValue(18, 20, 22, 24),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  orderTableText: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 5, 6, 8),
    borderRadius: getResponsiveValue(12, 14, 16, 18),
  },
  statusBadgeText: {
    fontSize: getResponsiveValue(10, 11, 12, 13),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'System',
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
    fontSize: getResponsiveValue(12, 13, 14, 16),
    color: '#6B7280',
    fontFamily: 'System',
  },
  detailButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  detailButtonText: {
    color: 'white',
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    fontFamily: 'System',
  },
  filterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    paddingBottom: getResponsiveValue(20, 24, 28, 32), // Alt boşluk artırıldı
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    gap: getResponsiveValue(4, 6, 8, 10),
  },
  filterButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    minWidth: getResponsiveValue(80, 90, 100, 110),
    maxWidth: getResponsiveValue(120, 130, 140, 150),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveValue(4, 6, 8, 10),
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
    fontSize: getResponsiveValue(10, 11, 12, 13),
    lineHeight: getResponsiveValue(12, 14, 16, 18),
    numberOfLines: 1,
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '700',
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
});
