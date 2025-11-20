import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
  Animated,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { getImageUrl } from '../utils/storage';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

// İndirim hesaplama helper fonksiyonu
const calculateDiscount = (totalPrice, discount) => {
  if (!discount || !totalPrice || totalPrice <= 0) return 0;
  
  let discountAmount = 0;
  if (discount.indirim_tipi === 'yuzde') {
    discountAmount = (totalPrice * discount.indirim_degeri) / 100;
  } else if (discount.indirim_tipi === 'miktar') {
    discountAmount = parseFloat(discount.indirim_degeri) || 0;
    if (discountAmount > totalPrice) {
      discountAmount = totalPrice;
    }
  }
  return Math.max(0, Math.min(discountAmount, totalPrice));
};

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function CartScreen() {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animasyon değişkenleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Hook'ları önce çağır
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
    getDiscountedPrice,
    getDiscountAmount,
    selectedGeneralDiscount, // Otomatik seçilen genel indirim
    selectedProductDiscounts, // Ürün bazlı seçili indirimler
    availableDiscounts,
    loadAvailableDiscounts,
    setSelectedDiscount, // Geriye dönük uyumluluk
    setSelectedGeneralDiscount, // Genel indirim seçimi için
    setSelectedProductDiscount,
    clearSelectedProductDiscount,
    userManuallyRemovedGeneralDiscount, // Kullanıcı manuel kaldırdı mı flag'i
    createOrder,
    dispatch
  } = useCartStore();
  
  const { setCurrentOrder, phoneToken, user } = useAppStore();

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

  // Sayfa her açıldığında yenile ve indirimleri yükle
  useFocusEffect(
    useCallback(() => {
      // İndirimleri yükle (kullanıcı manuel kaldırmadıysa)
      if (items.length > 0 && !userManuallyRemovedGeneralDiscount) {
        const totalPrice = getTotalPrice();
        loadAvailableDiscounts(user?.id || null, totalPrice);
      }
    }, [items.length, user?.id, getTotalPrice, loadAvailableDiscounts, userManuallyRemovedGeneralDiscount])
  );
  
  // Sepet toplamı değiştiğinde indirimleri yeniden yükle
  // Ama kullanıcı manuel kaldırdıysa, otomatik yükleme yapma
  useEffect(() => {
    if (items.length > 0 && !userManuallyRemovedGeneralDiscount) {
      const totalPrice = getTotalPrice();
      loadAvailableDiscounts(user?.id || null, totalPrice);
    }
  }, [items, user?.id, getTotalPrice, loadAvailableDiscounts, userManuallyRemovedGeneralDiscount]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // İndirimleri yeniden yükle
      if (items.length > 0 && !userManuallyRemovedGeneralDiscount) {
        const totalPrice = getTotalPrice();
        await loadAvailableDiscounts(user?.id || null, totalPrice);
      }
    } catch (error) {
      console.error('Refresh hatası:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // İndirim kod girişi state
  const [showDiscountList, setShowDiscountList] = useState(false);
  const [showProductDiscountModal, setShowProductDiscountModal] = useState(false);
  const [selectedProductForDiscount, setSelectedProductForDiscount] = useState(null);

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '₺0.00';
    return `₺${numPrice.toFixed(2)}`;
  };

  // Resim URL'sini Supabase Storage'dan al
  const getImageUri = (resimPath) => {
    return getImageUrl(resimPath);
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

  // İndirimi seç (genel veya ürün bazlı)
  const handleSelectDiscount = (discount, productId = null) => {
    // Eğer genel indirim ise genel'e, ürün bazlı ise ürün'e ekle
    if (discount.hedef_tipi === 'genel') {
      // Genel indirimi seç
      setSelectedGeneralDiscount(discount);
      setShowDiscountList(false);
      Alert.alert('Başarılı', `${discount.kampanya_adi} indirimi uygulandı!`);
    } else {
      // Ürün bazlı indirim seçimi
      // productId parametresi varsa (modal'dan geliyorsa) onu kullan
      // Yoksa discount.urun_id kullan (genel listeden seçildiyse)
      const targetProductId = productId || (discount.urun_id ? discount.urun_id.toString() : null);
      
      if (targetProductId) {
        setSelectedProductDiscount(targetProductId, discount);
        setShowProductDiscountModal(false);
        setSelectedProductForDiscount(null);
        Alert.alert('Başarılı', `${discount.kampanya_adi} indirimi uygulandı!`);
      }
    }
  };

  // Ürün için indirim seçim modalını aç
  const handleOpenProductDiscountModal = (item) => {
    setSelectedProductForDiscount(item);
    setShowProductDiscountModal(true);
  };

  // Ürün bazlı indirimi kaldır
  const handleRemoveProductDiscount = (productId) => {
    clearSelectedProductDiscount(productId.toString());
    Alert.alert('Bilgi', 'Ürün indirimi kaldırıldı.');
  };



  const handleCheckout = async () => {
    setIsSubmitting(true);

    try {
      
      // CartStore'daki createOrder fonksiyonunu kullan
      const orderData = await createOrder(phoneToken);
      

      // Siparişi app store'a kaydet
      setCurrentOrder(orderData);

      const hasDiscount = selectedGeneralDiscount;
      const message = hasDiscount
        ? `Sipariş numaranız: ${orderData.siparis_no}\nAra toplam: ${formatPrice(getTotalPrice())}\nİndirim: -${formatPrice(getDiscountAmount())}\nToplam tutar: ${formatPrice(orderData.toplam_tutar)}`
        : `Sipariş numaranız: ${orderData.siparis_no}\nToplam tutar: ${formatPrice(orderData.toplam_tutar)}`;
      
      Alert.alert(
        'Siparişiniz Verilmiştir! 🎉',
        message,
        [
          {
            text: 'Siparişlerim',
            onPress: () => navigation.navigate('Siparişlerim', { orderId: orderData.id })
          },
          {
            text: 'Ana Sayfaya Dön',
            onPress: () => navigation.navigate('Menü')
          }
        ]
      );

    } catch (error) {
      Alert.alert('Hata', error.message || 'Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartItem = (item, index) => {
    const customizationsText = item.customizations && Object.values(item.customizations).length > 0 
      ? Object.values(item.customizations)
          .map(customization => customization?.name || '')
          .filter(name => name && name.trim())
          .join(', ')
      : '';

    // Bu ürün için kullanılabilir indirimleri filtrele (ürün bazlı, kategori bazlı, popüler, yeni - genel hariç)
    // Genel indirimler zaten genel olarak uygulanıyor, ürün bazlı gösterilmemeli
    const productDiscounts = availableDiscounts.filter(d => {
      // Genel indirimleri atla
      if (d.hedef_tipi === 'genel' && !d.urun_filtre_tipi) {
        return false;
      }
      
      // Ürün bazlı indirim
      if (d.urun_filtre_tipi === 'urun' && d.urun_id === item.id) {
        return true;
      }
      
      // Kategori bazlı indirim (item'da kategori_id varsa)
      if (d.urun_filtre_tipi === 'kategori' && d.kategori_id === item.kategori_id) {
        return true;
      }
      
      // Yeni ürün indirimi
      if (d.urun_filtre_tipi === 'yeni_urun' && item.yeni_urun === true) {
        return true;
      }
      
      // Popüler ürün indirimi
      if (d.urun_filtre_tipi === 'populer_urun' && item.populer === true) {
        return true;
      }
      
      return false;
    });
    
    const selectedProductDiscount = selectedProductDiscounts[item.id.toString()];
    // Eğer sadece 1 indirim varsa buton gösterme (otomatik seçilecek)
    const hasProductDiscounts = productDiscounts.length > 1;

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
              <Text style={styles.itemName}>{item.name || 'Ürün'}</Text>
              
              {customizationsText && customizationsText.trim() && (
                <Text style={styles.customizations}>
                  {customizationsText}
                </Text>
              )}
              
              {item.notes && item.notes.trim() && (
                <Text style={styles.notes}>
                  Not: {item.notes}
                </Text>
              )}

              {/* Seçili ürün indirimi göster */}
              {selectedProductDiscount && (
                <View style={styles.productDiscountBadge}>
                  <Ionicons name="pricetag" size={14} color="#10B981" />
                  <Text style={styles.productDiscountText}>
                    {selectedProductDiscount.kampanya_adi} - {formatPrice(calculateDiscount(item.price * item.quantity, selectedProductDiscount))} indirim
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveProductDiscount(item.id)}
                    style={styles.removeProductDiscountButton}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              {hasProductDiscounts && (
                <TouchableOpacity
                  style={styles.discountButton}
                  onPress={() => handleOpenProductDiscountModal(item)}
                >
                  <Ionicons name="pricetag-outline" size={16} color="#8B4513" />
                </TouchableOpacity>
              )}
              
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
            <View>
              {selectedProductDiscount ? (
                <>
                  <Text style={styles.itemPriceOriginal}>
                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatPrice(Math.max(0, (item.price || 0) * (item.quantity || 1) - calculateDiscount((item.price || 0) * (item.quantity || 1), selectedProductDiscount)))}
                  </Text>
                </>
              ) : (
                <Text style={styles.itemPrice}>
                  {formatPrice((item.price || 0) * (item.quantity || 1))}
                </Text>
              )}
            </View>
            
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
      <View style={styles.container}>
        <TableHeader 
        onSidebarPress={() => setSidebarVisible(true)}
        onInfoPress={() => navigation.navigate('InfoScreen')}
      />

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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TableHeader 
        onSidebarPress={() => setSidebarVisible(true)}
        onInfoPress={() => navigation.navigate('InfoScreen')}
      />

      <Animated.ScrollView style={[
        styles.scrollView,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        <View style={styles.content}>
          <View style={styles.tableInfo}>
            <Ionicons name="restaurant" size={20} color="#8B4513" />
            <Text style={styles.tableText}>{tableNumber}</Text>
          </View>

          {items.map((item, index) => renderCartItem(item, index))}
          
          {/* İndirim Bölümü */}
          <View style={styles.discountSection}>
            <Text style={styles.discountSectionTitle}>İndirimler</Text>
            
            {/* Seçili İndirim */}
            {/* Genel İndirim (Otomatik - Sadece 1 tane varsa, veya kullanıcı seçtiyse) */}
            {selectedGeneralDiscount && (
              <View style={[styles.selectedDiscountCard, styles.generalDiscountCard]}>
                <View style={styles.selectedDiscountInfo}>
                  <Ionicons name="sparkles" size={20} color="#8B4513" />
                  <View style={styles.selectedDiscountTextContainer}>
                    <Text style={styles.selectedDiscountName}>
                      {selectedGeneralDiscount.kampanya_adi}
                      {availableDiscounts.filter(d => d.hedef_tipi === 'genel').length <= 1 && ' (Otomatik)'}
                    </Text>
                    <Text style={styles.selectedDiscountAmount}>
                      {formatPrice(calculateDiscount(getTotalPrice(), selectedGeneralDiscount))} indirim
                    </Text>
                  </View>
                </View>
                {availableDiscounts.filter(d => d.hedef_tipi === 'genel').length > 1 ? (
                  <TouchableOpacity
                    style={styles.removeDiscountButton}
                    onPress={() => {
                      setSelectedGeneralDiscount(null); // Genel indirimi kaldır
                      Alert.alert('Bilgi', 'Genel indirim kaldırıldı.');
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                )}
              </View>
            )}

            {/* Kullanılabilir İndirimler Listesi - Boş (sadece genel indirim kullanılıyor) */}
            {availableDiscounts.length > 0 && (
              <View style={styles.availableDiscountsContainer}>
                <TouchableOpacity
                  style={styles.showDiscountsButton}
                  onPress={() => setShowDiscountList(!showDiscountList)}
                >
                  <Text style={styles.showDiscountsButtonText}>
                    {showDiscountList ? 'İndirimleri Gizle' : `Kullanılabilir İndirimler (${availableDiscounts.length})`}
                  </Text>
                  <Ionicons 
                    name={showDiscountList ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#8B4513" 
                  />
                </TouchableOpacity>

                {showDiscountList && (
                  <View style={styles.discountsList}>
                    {availableDiscounts.length === 0 ? (
                      <View style={styles.noDiscountsContainer}>
                        <Ionicons name="pricetag-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.noDiscountsText}>Kullanılabilir ek indirim yok</Text>
                        <Text style={styles.noDiscountsSubtext}>
                          Genel indirim zaten otomatik uygulanıyor
                        </Text>
                      </View>
                    ) : (() => {
                      // Duplicate kontrolü: Aynı indirim_id'ye sahip indirimleri temizle
                      const uniqueDiscounts = [];
                      const seenIndirimIds = new Set();
                      availableDiscounts.forEach(d => {
                        if (!seenIndirimIds.has(d.indirim_id)) {
                          seenIndirimIds.add(d.indirim_id);
                          uniqueDiscounts.push(d);
                        }
                      });
                      
                      return uniqueDiscounts.map((discount, index) => {
                        // Seçili kontrolü - sadece genel indirim
                        const isSelected = selectedGeneralDiscount?.indirim_id === discount.indirim_id;
                        return (
                          <TouchableOpacity
                            key={`${discount.indirim_id}-${index}`}
                            style={[
                              styles.discountCard,
                              isSelected && styles.discountCardSelected
                            ]}
                            onPress={() => handleSelectDiscount(discount)}
                          >
                            <View style={styles.discountCardContent}>
                              <View style={styles.discountCardHeader}>
                                <Ionicons 
                                  name={isSelected ? "checkmark-circle" : "pricetag"} 
                                  size={18} 
                                  color={isSelected ? "#10B981" : "#8B4513"} 
                                />
                                <Text style={[
                                  styles.discountCardName,
                                  isSelected && styles.discountCardNameSelected
                                ]}>
                                  {discount.kampanya_adi}
                                </Text>
                              </View>
                              <Text style={styles.discountCardDescription}>
                                {discount.urun_filtre_tipi === 'urun' 
                                  ? 'Ürün Bazlı İndirim'
                                  : discount.hedef_tipi === 'genel'
                                  ? 'Genel İndirim'
                                  : discount.hedef_tipi === 'kayit'
                                  ? 'Kayıt İndirimi'
                                  : discount.hedef_tipi === 'kisi_bazli'
                                  ? 'Kişi Bazlı İndirim'
                                  : 'İndirim'
                                }
                                {discount.urun_filtre_tipi === 'urun' && discount.urun_id && (
                                  <Text style={styles.discountProductInfo}>
                                    {' • '}
                                    {items.find(item => item.id === discount.urun_id)?.name || 'Ürün'}
                                  </Text>
                                )}
                                {discount.indirim_tipi === 'yuzde' 
                                  ? ` • %${discount.indirim_degeri} indirim`
                                  : ` • ${formatPrice(discount.indirim_degeri)} indirim`
                                }
                              </Text>
                              <Text style={[
                                styles.discountCardAmount,
                                isSelected && styles.discountCardAmountSelected
                              ]}>
                                {formatPrice(discount.uygulanabilir_indirim)} tasarruf
                              </Text>
                            </View>
                            <Ionicons 
                              name={isSelected ? "checkmark-circle" : "chevron-forward"} 
                              size={20} 
                              color={isSelected ? "#10B981" : "#8B4513"} 
                            />
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Toplam Ürün:</Text>
            <Text style={styles.summaryValue}>{getTotalItems()} adet</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam:</Text>
            <Text style={styles.summaryValue}>{formatPrice(getTotalPrice())}</Text>
          </View>
          {(selectedGeneralDiscount || Object.keys(selectedProductDiscounts || {}).length > 0) && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>İndirim:</Text>
                <Text style={styles.discountAmount}>-{formatPrice(getDiscountAmount())}</Text>
              </View>
            </>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Toplam Tutar:</Text>
            <Text style={styles.totalAmount}>{formatPrice(getDiscountedPrice())}</Text>
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

      {/* Ürün Bazlı İndirim Seçim Modal */}
      <Modal
        visible={showProductDiscountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowProductDiscountModal(false);
          setSelectedProductForDiscount(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.discountModalContent}>
            <View style={styles.discountModalHeader}>
              <Text style={styles.discountModalTitle}>
                {selectedProductForDiscount?.name} için İndirim Seç
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProductDiscountModal(false);
                  setSelectedProductForDiscount(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.discountModalScrollView}>
              {selectedProductForDiscount && (() => {
                // Bu ürün için geçerli tüm indirimleri filtrele (genel hariç)
                const productDiscounts = availableDiscounts.filter(d => {
                  // Genel indirimleri atla (onlar zaten genel olarak uygulanıyor)
                  if (d.hedef_tipi === 'genel' && !d.urun_filtre_tipi) {
                    return false;
                  }
                  
                  // Ürün bazlı indirim
                  if (d.urun_filtre_tipi === 'urun' && d.urun_id === selectedProductForDiscount.id) {
                    return true;
                  }
                  
                  // Kategori bazlı indirim
                  if (d.urun_filtre_tipi === 'kategori' && d.kategori_id === selectedProductForDiscount.kategori_id) {
                    return true;
                  }
                  
                  // Yeni ürün indirimi
                  if (d.urun_filtre_tipi === 'yeni_urun' && selectedProductForDiscount.yeni_urun === true) {
                    return true;
                  }
                  
                  // Popüler ürün indirimi
                  if (d.urun_filtre_tipi === 'populer_urun' && selectedProductForDiscount.populer === true) {
                    return true;
                  }
                  
                  return false;
                });
                
                const selectedDiscount = selectedProductDiscounts[selectedProductForDiscount.id.toString()];
                
                if (productDiscounts.length === 0) {
                  return (
                    <View style={styles.noDiscountsContainer}>
                      <Ionicons name="pricetag-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.noDiscountsText}>Bu ürün için indirim bulunamadı</Text>
                    </View>
                  );
                }
                
                return productDiscounts.map((discount, index) => {
                  const isSelected = selectedDiscount?.indirim_id === discount.indirim_id;
                  const itemTotal = selectedProductForDiscount.price * selectedProductForDiscount.quantity;
                  const discountAmount = calculateDiscount(itemTotal, discount);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.discountCard,
                        isSelected && styles.discountCardSelected
                      ]}
                      onPress={() => handleSelectDiscount(discount, selectedProductForDiscount.id.toString())}
                    >
                      <View style={styles.discountCardContent}>
                        <View style={styles.discountCardHeader}>
                          <Ionicons 
                            name={isSelected ? "checkmark-circle" : "pricetag"} 
                            size={18} 
                            color={isSelected ? "#10B981" : "#8B4513"} 
                          />
                          <Text style={[
                            styles.discountCardName,
                            isSelected && styles.discountCardNameSelected
                          ]}>
                            {discount.kampanya_adi}
                          </Text>
                        </View>
                        <Text style={styles.discountCardDescription}>
                          {discount.indirim_tipi === 'yuzde' 
                            ? `%${discount.indirim_degeri} indirim`
                            : `${formatPrice(discount.indirim_degeri)} indirim`
                          }
                        </Text>
                        <Text style={[
                          styles.discountCardAmount,
                          isSelected && styles.discountCardAmountSelected
                        ]}>
                          {formatPrice(discountAmount)} tasarruf
                        </Text>
                      </View>
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "chevron-forward"} 
                        size={20} 
                        color={isSelected ? "#10B981" : "#8B4513"} 
                      />
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
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
  // İndirim Stilleri
  discountSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discountSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  selectedDiscountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  generalDiscountCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  selectedDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectedDiscountTextContainer: {
    flex: 1,
  },
  selectedDiscountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  selectedDiscountAmount: {
    fontSize: 14,
    color: '#047857',
  },
  removeDiscountButton: {
    padding: 4,
  },
  availableDiscountsContainer: {
    marginTop: 8,
  },
  showDiscountsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  showDiscountsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  discountsList: {
    marginTop: 8,
    gap: 8,
  },
  discountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountCardSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  discountCardContent: {
    flex: 1,
  },
  discountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  discountCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  discountCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  discountCardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  discountCardNameSelected: {
    color: '#059669',
  },
  discountCardAmountSelected: {
    color: '#047857',
  },
  discountAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  noDiscountsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noDiscountsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  noDiscountsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  discountProductInfo: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  // Ürün İndirim Stilleri
  discountButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  productDiscountText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  removeProductDiscountButton: {
    padding: 2,
  },
  itemPriceOriginal: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  // İndirim Seçim Modal Stilleri
  discountModalContent: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  discountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    paddingBottom: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  discountModalTitle: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  discountModalScrollView: {
    maxHeight: 400,
  },
});
