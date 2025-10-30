import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';

const { width } = Dimensions.get('window');

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order, orderDetails } = route.params;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(order.aciklama || '');
  const [currentOrder, setCurrentOrder] = useState(order);
  const [currentOrderDetails, setCurrentOrderDetails] = useState(orderDetails);
  const [isEditingQuantities, setIsEditingQuantities] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const saveModalAnim = useRef(new Animated.Value(0)).current;

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
    const numericPrice = parseFloat(price) || 0;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(numericPrice);
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

  // Adet azaltma fonksiyonu
  const handleDecreaseQuantity = (itemId) => {
    const currentQuantity = editedQuantities[itemId] || currentOrderDetails.find(detail => detail.id === itemId)?.adet || 1;
    if (currentQuantity > 1) {
      setEditedQuantities(prev => ({
        ...prev,
        [itemId]: currentQuantity - 1
      }));
      setHasChanges(true);
      
      // Toplam tutarı güncelle
      updateTotalAmount();
    }
  };

  // Adet artırma fonksiyonu
  const handleIncreaseQuantity = (itemId) => {
    const currentQuantity = editedQuantities[itemId] || currentOrderDetails.find(detail => detail.id === itemId)?.adet || 1;
    setEditedQuantities(prev => ({
      ...prev,
      [itemId]: currentQuantity + 1
    }));
    setHasChanges(true);
    
    // Toplam tutarı güncelle
    updateTotalAmount();
  };

  // Toplam tutarı güncelleme fonksiyonu
  const updateTotalAmount = () => {
    const newTotal = currentOrderDetails
      .filter(detail => !deletedItems.includes(detail.id)) // Silinen ürünleri çıkar
      .reduce((sum, detail) => {
        // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
        let birimFiyat = parseFloat(detail.birim_fiyat) || 0;
        if (birimFiyat === 0 && detail.urunler?.fiyat) {
          birimFiyat = parseFloat(detail.urunler.fiyat) || 0;
        }
        
        const adet = editedQuantities[detail.id] || detail.adet;
        const toplamFiyat = birimFiyat * adet;
        
        return sum + toplamFiyat;
      }, 0);
    
    setCurrentOrder(prev => ({ ...prev, toplam_tutar: newTotal }));
  };

  // Ürün silme fonksiyonu
  const handleDeleteItem = (itemId) => {
    setDeletedItems(prev => [...prev, itemId]);
    setHasChanges(true);
    
    // Toplam tutarı güncelle
    updateTotalAmount();
  };

  // Silinen ürünü geri alma fonksiyonu
  const handleRestoreItem = (itemId) => {
    setDeletedItems(prev => prev.filter(id => id !== itemId));
    setHasChanges(true);
    
    // Toplam tutarı güncelle
    updateTotalAmount();
  };

  // Kaydet modalını açma
  const handleSaveChanges = () => {
    setShowSaveModal(true);
    Animated.timing(saveModalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideSaveModal = () => {
    Animated.timing(saveModalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSaveModal(false);
    });
  };

  // Değişiklikleri kaydetme
  const confirmSaveChanges = async () => {
    try {
      const updates = [];
      let newTotal = 0;

      // Silinen ürünleri veritabanından sil
      for (const itemId of deletedItems) {
        updates.push(
          supabase
            .from(TABLES.SIPARIS_DETAYLARI)
            .delete()
            .eq('id', itemId)
        );
      }

      // Adet değişikliklerini güncelle
      for (const [itemId, newQuantity] of Object.entries(editedQuantities)) {
        const item = currentOrderDetails.find(detail => detail.id === parseInt(itemId));
        if (item && newQuantity !== item.adet) {
          // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
          let birimFiyat = parseFloat(item.birim_fiyat) || 0;
          if (birimFiyat === 0 && item.urunler?.fiyat) {
            birimFiyat = parseFloat(item.urunler.fiyat) || 0;
          }
          
          const newTotalPrice = birimFiyat * newQuantity;
          
          updates.push(
            supabase
              .from(TABLES.SIPARIS_DETAYLARI)
              .update({ 
                adet: newQuantity,
                birim_fiyat: birimFiyat,
                toplam_fiyat: newTotalPrice 
              })
              .eq('id', itemId)
          );
        }
      }

      // Tüm güncellemeleri paralel olarak yap
      const results = await Promise.all(updates);
      
      // Hata kontrolü
      for (const result of results) {
        if (result.error) {
          throw result.error;
        }
      }

      // State'i güncelle
      let updatedDetails = currentOrderDetails
        .filter(detail => !deletedItems.includes(detail.id))
        .map(detail => {
          const newQuantity = editedQuantities[detail.id];
          if (newQuantity !== undefined) {
            // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
            let birimFiyat = parseFloat(detail.birim_fiyat) || 0;
            if (birimFiyat === 0 && detail.urunler?.fiyat) {
              birimFiyat = parseFloat(detail.urunler.fiyat) || 0;
            }
            
            return {
              ...detail,
              adet: newQuantity,
              birim_fiyat: birimFiyat,
              toplam_fiyat: birimFiyat * newQuantity
            };
          }
          return detail;
        });

      // Eğer hiç ürün kalmadıysa siparişi iptal et
      if (updatedDetails.length === 0) {
        const { error: orderError } = await supabase
          .from(TABLES.SIPARISLER)
          .update({ durum: 'iptal' })
          .eq('id', currentOrder.id);

        if (orderError) {
          throw orderError;
        }

        hideSaveModal();
        setCurrentOrder(prev => ({ ...prev, durum: 'iptal' }));
        Alert.alert('Başarılı', 'Son ürün silindi, sipariş iptal edildi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('OrderStatusMain', { 
            order: { ...currentOrder, durum: 'iptal' },
            orderDetails: updatedDetails 
          })}
        ]);
        return;
      }

      // Yeni toplam tutarı hesapla
      newTotal = updatedDetails.reduce((sum, detail) => {
        // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
        let birimFiyat = parseFloat(detail.birim_fiyat) || 0;
        if (birimFiyat === 0 && detail.urunler?.fiyat) {
          birimFiyat = parseFloat(detail.urunler.fiyat) || 0;
        }
        
        const adet = editedQuantities[detail.id] || detail.adet;
        const toplamFiyat = birimFiyat * adet;
        
        console.log('Toplam hesaplama:', {
          id: detail.id,
          ad: detail.urunler?.ad,
          birim_fiyat: detail.birim_fiyat,
          calculated_birim_fiyat: birimFiyat,
          adet: detail.adet,
          calculated_adet: adet,
          toplam_fiyat: toplamFiyat,
          sum: sum
        });
        
        return sum + toplamFiyat;
      }, 0);
      
      console.log('Final newTotal:', newTotal);
      

      // Sipariş toplam tutarını güncelle
      const { error: orderUpdateError } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ toplam_tutar: newTotal || 0 })
        .eq('id', currentOrder.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      // State'leri güncelle
      setCurrentOrderDetails(updatedDetails);
      setCurrentOrder(prev => ({ ...prev, toplam_tutar: newTotal }));
      setEditedQuantities({});
      setDeletedItems([]);
      setHasChanges(false);
      hideSaveModal();

      // OrderStatus sayfasına yönlendir
      navigation.navigate('OrderStatusMain', { 
        order: { ...currentOrder, toplam_tutar: newTotal },
        orderDetails: updatedDetails 
      });

    } catch (error) {
      console.error('Değişiklik kaydetme hatası:', error);
      Alert.alert('Hata', `Değişiklikler kaydedilirken bir hata oluştu: ${error.message}`);
    }
  };

  // Adet düzenleme modunu iptal etme
  const handleCancelQuantityEdit = () => {
    setEditedQuantities({});
    setDeletedItems([]);
    setHasChanges(false);
    setIsEditingQuantities(false);
  };

  // Notları kaydetme (beklemede durumunda database'de de güncelle)
  const handleSaveNotes = async () => {
    // Sadece beklemede durumunda not değiştirmeye izin ver
    if (currentOrder.durum !== 'beklemede') {
      Alert.alert('Uyarı', 'Sadece beklemede olan siparişlerin notları değiştirilebilir.');
      return;
    }

    try {
      
      // Database'de güncelle
      const { data, error } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ aciklama: notesText || null })
        .eq('id', currentOrder.id)
        .select();


      if (error) {
        console.error('Database güncelleme hatası:', error);
        throw error;
      }

      // State'de güncelle
      setCurrentOrder(prev => ({ ...prev, aciklama: notesText }));
      setIsEditingNotes(false);
      Alert.alert('Başarılı', 'Notlar güncellendi.');

    } catch (error) {
      console.error('Not kaydetme hatası:', error);
      Alert.alert('Hata', `Notlar kaydedilirken bir hata oluştu: ${error.message}`);
    }
  };

  const handleCancelEditNotes = () => {
    setNotesText(currentOrder.aciklama || '');
    setIsEditingNotes(false);
  };

  // Modal animasyon fonksiyonları
  const showModal = () => {
    setShowCancelModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowCancelModal(false);
    });
  };

  // Siparişi iptal etme modalını açma
  const handleCancelOrder = () => {
    showModal();
  };

  // Siparişi iptal etme işlemi
  const confirmCancelOrder = async () => {
    try {
      // Sipariş durumunu iptal olarak güncelle
      const { error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ durum: 'iptal' })
        .eq('id', currentOrder.id);

      if (orderError) {
        throw orderError;
      }

      // State'i güncelle
      setCurrentOrder(prev => ({ ...prev, durum: 'iptal' }));
      hideModal();

      // OrderStatus sayfasına yönlendir
      navigation.navigate('OrderStatusMain', { 
        order: { ...currentOrder, durum: 'iptal' },
        orderDetails: currentOrderDetails
      });

    } catch (error) {
      console.error('Sipariş iptal etme hatası:', error);
      Alert.alert('Hata', `Sipariş iptal edilirken bir hata oluştu: ${error.message}`);
    }
  };

  // Modalı kapatma
  const closeCancelModal = () => {
    hideModal();
  };



  const renderOrderItem = (item) => {
    const currentQuantity = editedQuantities[item.id] || item.adet;
    
    // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
    let birimFiyat = parseFloat(item.birim_fiyat) || 0;
    if (birimFiyat === 0 && item.urunler?.fiyat) {
      birimFiyat = parseFloat(item.urunler.fiyat) || 0;
    }
    
    const currentTotalPrice = birimFiyat * currentQuantity;
    const isDeleted = deletedItems.includes(item.id);
    
    
    if (isDeleted) {
      return (
        <View key={item.id} style={[styles.orderItem, styles.deletedItem]}>
          <View style={styles.itemInfo}>
            <Text style={styles.deletedItemName}>{item.urunler?.ad || 'Ürün'}</Text>
            <Text style={styles.deletedItemQuantity}>x{currentQuantity} - Silinecek</Text>
          </View>
          <View style={styles.itemActions}>
            <Text style={styles.deletedItemPrice}>{formatPrice(currentTotalPrice)}</Text>
            
            {/* Sadece beklemede durumunda geri alma butonunu göster */}
            {currentOrder.durum === 'beklemede' && (
              <TouchableOpacity 
                style={styles.restoreItemButton}
                onPress={() => handleRestoreItem(item.id)}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    
    return (
      <View key={item.id} style={styles.orderItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.urunler?.ad || 'Ürün'}</Text>
          <Text style={styles.itemQuantity}>x{currentQuantity}</Text>
        </View>
        <View style={styles.itemActions}>
          <Text style={styles.itemPrice}>{formatPrice(currentTotalPrice)}</Text>
          
          {/* Sadece beklemede durumunda düzenleme butonlarını göster */}
          {currentOrder.durum === 'beklemede' && (
            <View style={styles.itemControlButtons}>
              {/* Adet düzenleme butonları */}
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={[styles.quantityButton, currentQuantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={() => handleDecreaseQuantity(item.id)}
                  disabled={currentQuantity <= 1}
                >
                  <Ionicons name="remove" size={16} color={currentQuantity <= 1 ? "#9CA3AF" : "#FFFFFF"} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{currentQuantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleIncreaseQuantity(item.id)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {/* Sil butonu */}
              <TouchableOpacity 
                style={styles.deleteItemButton}
                onPress={() => handleDeleteItem(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

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
          <Ionicons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sipariş Detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sipariş Özeti */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.orderNumber}>#{currentOrder.siparis_no}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusInfo(currentOrder.durum).color }
            ]}>
              <Text style={styles.statusBadgeText}>
                {getStatusInfo(currentOrder.durum).label}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Sipariş Tarihi: {formatDate(currentOrder.olusturma_tarihi)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="restaurant" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {currentOrder.qr_token ? 'QR Token: ' + currentOrder.qr_token : 'Bilinmiyor'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sipariş Detayları */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Sipariş Detayları</Text>
          {currentOrderDetails.map(renderOrderItem)}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Toplam Tutar:</Text>
            <Text style={styles.totalAmount}>
              {formatPrice(
                currentOrderDetails
                  .filter(detail => !deletedItems.includes(detail.id)) // Silinen ürünleri çıkar
                  .reduce((sum, detail) => {
                    // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
                    let birimFiyat = parseFloat(detail.birim_fiyat) || 0;
                    if (birimFiyat === 0 && detail.urunler?.fiyat) {
                      birimFiyat = parseFloat(detail.urunler.fiyat) || 0;
                    }
                    
                    const adet = editedQuantities[detail.id] || detail.adet;
                    const toplamFiyat = birimFiyat * adet;
                    
                    return sum + toplamFiyat;
                  }, 0)
              )}
            </Text>
          </View>
        </View>

        {/* Notlar */}
        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          
          {isEditingNotes ? (
            <View style={styles.notesEditContainer}>
              <TextInput
                style={styles.notesTextInput}
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Notlarınızı buraya yazın..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.notesEditButtons}>
                <TouchableOpacity 
                  style={[styles.notesEditButton, styles.cancelEditButton]}
                  onPress={handleCancelEditNotes}
                >
                  <Text style={styles.cancelEditButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.notesEditButton, styles.saveEditButton]}
                  onPress={handleSaveNotes}
                >
                  <Text style={styles.saveEditButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.notesDisplayContainer}
              onPress={() => setIsEditingNotes(true)}
            >
              <Text style={styles.notesText}>
                {currentOrder.aciklama || 'Not eklemek için dokunun...'}
              </Text>
              <Ionicons name="create-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Kaydet Butonu - Sadece değişiklik varsa */}
        {currentOrder.durum === 'beklemede' && hasChanges && (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity 
              style={styles.saveButtonBottom}
              onPress={handleSaveChanges}
            >
              <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonBottomText}>Değişiklikleri Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sipariş İptal Etme Butonu - Sadece beklemede durumunda */}
        {currentOrder.durum === 'beklemede' && (
          <View style={styles.cancelOrderContainer}>
            <TouchableOpacity 
              style={styles.cancelOrderButton}
              onPress={handleCancelOrder}
            >
              <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.cancelOrderButtonText}>Siparişi İptal Et</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* İptal Etme Modalı */}
      {showCancelModal && (
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: modalAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={32} color="#F59E0B" />
              <Text style={styles.modalTitle}>Siparişi İptal Et</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Bu siparişi iptal etmek istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeCancelModal}
              >
                <Text style={styles.modalCancelButtonText}>Hayır</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmCancelOrder}
              >
                <Text style={styles.modalConfirmButtonText}>Evet, İptal Et</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Kaydet Modalı */}
      {showSaveModal && (
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: saveModalAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: saveModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                  {
                    translateY: saveModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
              <Text style={styles.modalTitle}>Değişiklikleri Kaydet</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Yaptığınız değişiklikleri kaydetmek istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={hideSaveModal}
              >
                <Text style={styles.modalCancelButtonText}>Hayır</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmSaveChanges}
              >
                <Text style={styles.modalConfirmButtonText}>Evet, Kaydet</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  itemActions: {
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 12,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButton: {
    backgroundColor: '#DC143C',
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
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
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    borderWidth: 0,
    gap: 8,
    minHeight: 40,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  editNotesButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  notesEditContainer: {
    gap: 12,
  },
  notesTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    fontFamily: 'System',
  },
  notesEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  notesEditButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 0,
    minHeight: 48,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelEditButton: {
    backgroundColor: '#DC143C',
  },
  saveEditButton: {
    backgroundColor: '#2ED573',
  },
  cancelEditButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  saveEditButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  cancelOrderContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  cancelOrderButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelOrderButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editQuantitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    borderWidth: 0,
    gap: 8,
    minHeight: 40,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  editQuantitiesButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    minWidth: 24,
    textAlign: 'center',
    fontFamily: 'System',
  },
  quantityEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quantityEditButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 0,
    minHeight: 48,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelQuantityButton: {
    backgroundColor: '#DC143C',
  },
  saveQuantityButton: {
    backgroundColor: '#2ED573',
  },
  cancelQuantityButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  saveQuantityButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'System',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalConfirmButton: {
    backgroundColor: '#F59E0B',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#10B981',
    borderWidth: 0,
    gap: 8,
    minHeight: 40,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  itemControlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deleteItemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  notesDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 50,
  },
  deletedItem: {
    opacity: 0.5,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deletedItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
  },
  deletedItemQuantity: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
    fontFamily: 'System',
  },
  deletedItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  restoreItemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  saveButtonBottom: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 8,
  },
  saveButtonBottomText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default OrderDetailScreen;
