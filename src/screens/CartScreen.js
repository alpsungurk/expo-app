import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function CartScreen() {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Animasyon değişkenleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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

  // Sayfa her açıldığında yenile (CartScreen'de özel veri yükleme yok)
  useFocusEffect(
    useCallback(() => {
      // CartScreen'de özel veri yükleme gerekmiyor
      // Sadece sayfa odaklandığında animasyonu yenile
    }, [])
  );
  
  const { 
    items, 
    tableNumber, 
    qrToken, 
    tableId, // Seçilen masa'nın id'si
    updateQuantity, 
    updateItemNotes,
    removeItem, 
    addItem,
    clearCart, 
    getTotalPrice, 
    getTotalItems,
    createOrder,
    dispatch
  } = useCartStore();
  
  const { setCurrentOrder, phoneToken } = useAppStore();

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '₺0.00';
    return `₺${numPrice.toFixed(2)}`;
  };

  // Resim URL'sini Supabase Storage'dan al
  const getImageUri = (resimPath) => {
    const STORAGE_BUCKET = 'images';
    
    if (!resimPath) return null;
    
    // Eğer zaten tam URL ise direkt kullan
    if (typeof resimPath === 'string' && /^https?:\/\//i.test(resimPath)) {
      return resimPath;
    }
    
    // Supabase Storage'dan public URL oluştur
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(resimPath);
    return data?.publicUrl || null;
  };

  const handleQuantityChange = (item, customizations, newQuantity) => {
    if (newQuantity === 0) {
      setItemToDelete({ item, customizations });
      setShowDeleteModal(true);
    } else {
      updateQuantity(item.id, customizations, newQuantity);
    }
  };

  const handleEditItem = (item) => {
    navigation.navigate('EditCartItem', { item });
  };


  const handleRemoveItem = (item, customizations) => {
    setItemToDelete({ item, customizations });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeItem(itemToDelete.item.id, itemToDelete.customizations || {});
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };



  const handleCheckout = async () => {
    setIsSubmitting(true);

    try {
      console.log('Sipariş oluşturuluyor, phoneToken:', phoneToken);
      
      // CartStore'daki createOrder fonksiyonunu kullan
      const orderData = await createOrder(phoneToken);
      
      console.log('Sipariş başarıyla oluşturuldu:', orderData);

      // Siparişi app store'a kaydet
      setCurrentOrder(orderData);

      Alert.alert(
        'Siparişiniz Verilmiştir! 🎉',
        `Sipariş numaranız: ${orderData.siparis_no}\nToplam tutar: ${formatPrice(orderData.toplam_tutar)}`,
        [
          {
            text: 'Siparişlerim',
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
      Alert.alert('Hata', error.message || 'Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartItem = (item, index) => {
    const customizationsText = item.customizations && Object.values(item.customizations).length > 0 
      ? Object.values(item.customizations)
          .map(customization => customization?.name || '')
          .filter(name => name)
          .join(', ')
      : '';

    return (
      <View key={`${item.id}-${index}`} style={styles.cartItem}>
        <View style={styles.itemImage}>
          {getImageUri(item.image) ? (
            <Image source={{ uri: getImageUri(item.image) }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cafe" size={24} color="#8B4513" />
            </View>
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
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
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditItem(item)}
              >
                <Ionicons name="create-outline" size={16} color="#8B4513" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item, item.customizations || {})}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>
              {formatPrice((item.price || 0) * (item.quantity || 1))}
            </Text>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item, item.customizations, (item.quantity || 1) - 1)}
              >
                <Ionicons name="remove" size={16} color="#8B4513" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity || 1}</Text>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item, item.customizations, (item.quantity || 1) + 1)}
              >
                <Ionicons name="add" size={16} color="#8B4513" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <Animated.View style={[
          styles.emptyContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
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
        </Animated.View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <Animated.ScrollView style={[
        styles.scrollView,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.tableInfo}>
            <Ionicons name="restaurant" size={20} color="#8B4513" />
            <Text style={styles.tableText}>{tableNumber}</Text>
          </View>

          {items.map((item, index) => renderCartItem(item, index))}
        </View>
      </Animated.ScrollView>

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

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Ürünü Sil</Text>
            </View>
            
            <Text style={styles.deleteModalDescription}>
              {itemToDelete && `${itemToDelete.item.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?`}
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteModalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>Sil</Text>
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 6,
    minWidth: 16,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  deleteModalTitle: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    marginBottom: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#6B7280',
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: 'white',
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: '600',
  },
});
