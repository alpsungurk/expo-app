import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function CartScreen() {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const { 
    items, 
    tableNumber, 
    qrToken, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    getTotalPrice, 
    getTotalItems 
  } = useCartStore();
  
  const { setCurrentOrder } = useAppStore();

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  const handleQuantityChange = (item, customizations, newQuantity) => {
    if (newQuantity === 0) {
      removeItem(item.id, customizations);
    } else {
      updateQuantity(item.id, customizations, newQuantity);
    }
  };

  const handleRemoveItem = (item, customizations) => {
    Alert.alert(
      'Ürünü Kaldır',
      `${item.name} sepetten kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Kaldır', 
          style: 'destructive',
          onPress: () => removeItem(item.id, customizations)
        }
      ]
    );
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SIP${timestamp}${random}`;
  };

  const handleCheckout = async () => {
    if (!tableNumber) {
      Alert.alert('Hata', 'Masa bilgisi bulunamadı. Lütfen QR kodu tekrar tarayın.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Hata', 'Sepetiniz boş.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const totalAmount = getTotalPrice();

      // Sipariş oluştur
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .insert({
          qr_token: qrToken,
          siparis_no: orderNumber,
          toplam_tutar: totalAmount,
          durum: 'beklemede',
          notlar: 'Müşteri siparişi'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Sipariş detaylarını oluştur
      const orderDetails = items.map(item => ({
        siparis_id: orderData.id,
        urun_id: item.id,
        adet: item.quantity,
        birim_fiyat: item.price,
        toplam_fiyat: item.price * item.quantity,
        ozellestirmeler: item.customizations,
        notlar: item.notes
      }));

      const { error: detailsError } = await supabase
        .from(TABLES.SIPARIS_DETAYLARI)
        .insert(orderDetails);

      if (detailsError) throw detailsError;

      // Siparişi store'a kaydet
      setCurrentOrder({
        ...orderData,
        siparis_detaylari: orderDetails
      });

      // Sepeti temizle
      clearCart();

      Alert.alert(
        'Sipariş Alındı! 🎉',
        `Sipariş numaranız: ${orderNumber}\nToplam tutar: ${formatPrice(totalAmount)}`,
        [
          {
            text: 'Sipariş Durumunu Görüntüle',
            onPress: () => navigation.navigate('OrderStatus', { orderId: orderData.id })
          },
          {
            text: 'Ana Sayfaya Dön',
            onPress: () => navigation.navigate('Menü')
          }
        ]
      );

    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartItem = (item, index) => {
    const customizationsText = Object.values(item.customizations)
      .map(customization => customization.name)
      .join(', ');

    return (
      <View key={`${item.id}-${index}`} style={styles.cartItem}>
        <View style={styles.itemImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cafe" size={24} color="#8B4513" />
            </View>
          )}
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          
          {customizationsText && (
            <Text style={styles.customizations}>
              {customizationsText}
            </Text>
          )}
          
          {item.notes && (
            <Text style={styles.notes}>
              Not: {item.notes}
            </Text>
          )}

          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>
              {formatPrice(item.price * item.quantity)}
            </Text>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item, item.customizations, item.quantity - 1)}
              >
                <Ionicons name="remove" size={16} color="#8B4513" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item, item.customizations, item.quantity + 1)}
              >
                <Ionicons name="add" size={16} color="#8B4513" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item, item.customizations)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
          <Text style={styles.emptyDescription}>
            Lezzetli ürünlerimizi keşfetmek için menüye göz atın
          </Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.navigate('Menü')}
          >
            <Text style={styles.shopButtonText}>Alışverişe Başla</Text>
          </TouchableOpacity>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.tableInfo}>
            <Ionicons name="restaurant" size={20} color="#8B4513" />
            <Text style={styles.tableText}>Masa {tableNumber}</Text>
          </View>

          {items.map((item, index) => renderCartItem(item, index))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Toplam Ürün:</Text>
            <Text style={styles.summaryValue}>{getTotalItems()} adet</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Toplam Tutar:</Text>
            <Text style={styles.totalAmount}>{formatPrice(getTotalPrice())}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.checkoutButton, isSubmitting && styles.disabledButton]}
          onPress={handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.checkoutButtonText}>Sipariş Veriliyor...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.checkoutButtonText}>Sipariş Ver</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
  content: {
    padding: 20,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginLeft: 8,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customizations: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomBar: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  checkoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
