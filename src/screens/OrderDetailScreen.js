import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order, orderDetails } = route.params;
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
      navigation.goBack();
    });
  };

  // Geri buton handler
  const handleGoBack = () => {
    slideOut();
  };

  // Component mount olduğunda animasyonu başlat
  useEffect(() => {
    slideIn();
  }, []);

  const getStatusInfo = (status) => {
    const statusMap = {
      beklemede: { label: 'Beklemede', color: '#F59E0B' },
      hazirlaniyor: { label: 'Hazırlanıyor', color: '#3B82F6' },
      hazir: { label: 'Hazır', color: '#10B981' },
      teslim_edildi: { label: 'Teslim Edildi', color: '#059669' },
      iptal: { label: 'İptal', color: '#EF4444' },
    };
    return statusMap[status] || { label: 'Bilinmiyor', color: '#6B7280' };
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.headerTitle}>Sipariş Detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sipariş Özeti */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.orderNumber}>#{order.siparis_no}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusInfo(order.durum).color }
            ]}>
              <Text style={styles.statusBadgeText}>
                {getStatusInfo(order.durum).label}
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
          </View>
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
        {order.aciklama && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notesText}>{order.aciklama}</Text>
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
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  summaryInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
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
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 16,
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
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'System',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'System',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'System',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
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
    shadowRadius: 4,
    elevation: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontFamily: 'System',
  },
});

export default OrderDetailScreen;
