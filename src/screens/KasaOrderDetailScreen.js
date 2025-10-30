import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions
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

// Sipariş durumları (veritabanı yapısına uygun)
const ORDER_STATUSES = {
  beklemede: { 
    label: 'Bekliyor', 
    color: '#6B7280', 
    bgColor: '#F3F4F6'
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
  const { order, orderDetails } = route.params;
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.beklemede;
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const updateOrderStatus = async (newStatus) => {
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ durum: newStatus })
        .eq('id', currentOrder.id);

      if (error) throw error;

      setCurrentOrder(prev => ({ ...prev, durum: newStatus }));
      
      Alert.alert('Başarılı', 'Sipariş durumu güncellendi.');
    } catch (error) {
      console.error('Sipariş güncelleme hatası:', error);
      Alert.alert('Hata', 'Sipariş durumu güncellenirken bir hata oluştu.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = (newStatus) => {
    const statusInfo = getStatusInfo(newStatus);
    
    Alert.alert(
      'Durum Güncelle',
      `Sipariş durumunu "${statusInfo.label}" olarak değiştirmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Güncelle', onPress: () => updateOrderStatus(newStatus) }
      ]
    );
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderActionButton = (status, icon, label, color) => {
    const isCurrentStatus = currentOrder.durum === status;
    
    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: color },
          isCurrentStatus && styles.actionButtonDisabled
        ]}
        onPress={() => !isCurrentStatus && handleStatusUpdate(status)}
        disabled={isCurrentStatus || isUpdating}
      >
        <Ionicons 
          name={icon} 
          size={getResponsiveValue(20, 22, 24, 26)} 
          color="white" 
        />
        <Text style={styles.actionButtonText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderProductItem = (item, index) => (
    <View key={index} style={styles.productItem}>
      <View style={styles.productIcon}>
        <Ionicons 
          name="cafe" 
          size={getResponsiveValue(20, 22, 24, 26)} 
          color="#8B4513" 
        />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.urunler?.ad || 'Ürün'}</Text>
        <Text style={styles.productQuantity}>x{item.adet}</Text>
      </View>
    </View>
  );

  const statusInfo = getStatusInfo(currentOrder.durum);

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
          Sipariş Detayı – Masa {currentOrder.masalar?.masa_no || currentOrder.masa_no}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sipariş Bilgileri */}
        <View style={styles.orderInfoCard}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Sipariş No</Text>
            <Text style={styles.orderInfoValue}>#{currentOrder.siparis_no}</Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Zamanı</Text>
            <Text style={styles.orderInfoValue}>{formatTime(currentOrder.olusturma_tarihi)}</Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Durum</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color }
            ]}>
              <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* Ürün Listesi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün Listesi</Text>
          <View style={styles.productsCard}>
            {orderDetails && orderDetails.length > 0 ? (
              orderDetails.map((item, index) => renderProductItem(item, index))
            ) : (
              <Text style={styles.noProductsText}>Ürün bulunamadı</Text>
            )}
          </View>
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>
              {currentOrder.notlar || 'Not yok'}
            </Text>
          </View>
        </View>

        {/* Toplam Tutar */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Toplam Tutar</Text>
          <Text style={styles.totalAmount}>{formatPrice(currentOrder.toplam_tutar)}</Text>
        </View>
      </ScrollView>

      {/* Aksiyon Butonları */}
      <View style={styles.actionsContainer}>
        <View style={styles.actionsGrid}>
          {renderActionButton('hazirlaniyor', 'play', 'Onayla', '#10B981')}
          {renderActionButton('hazir', 'checkmark', 'Hazır', '#F97316')}
          {renderActionButton('teslim_edildi', 'checkmark-done', 'Teslim Et', '#3B82F6')}
          {renderActionButton('iptal', 'close', 'İptal Et', '#EF4444')}
        </View>
      </View>

      {/* Loading Overlay */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={styles.loadingText}>Güncelleniyor...</Text>
          </View>
        </View>
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
    fontSize: getResponsiveValue(16, 17, 18, 20),
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
  orderInfoCard: {
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
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  orderInfoLabel: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderInfoValue: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 5, 6, 8),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  statusBadgeText: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'System',
  },
  section: {
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  sectionTitle: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    fontFamily: 'System',
  },
  productsCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  productIcon: {
    width: getResponsiveValue(40, 44, 48, 52),
    height: getResponsiveValue(40, 44, 48, 52),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  productQuantity: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'System',
  },
  noProductsText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'System',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
  },
  totalCard: {
    backgroundColor: '#8B4513',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(16, 18, 20, 22),
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: getResponsiveValue(16, 17, 18, 20),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'System',
  },
  totalAmount: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: 'white',
    fontFamily: 'System',
  },
  actionsContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    gap: getResponsiveValue(6, 8, 10, 12),
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    padding: getResponsiveValue(24, 28, 32, 36),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getResponsiveValue(12, 14, 16, 18),
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B7280',
    fontFamily: 'System',
  },
});
