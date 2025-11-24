import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { supabase, TABLES } from '../config/supabase';

const { width } = Dimensions.get('window');

// İndirim hesaplama helper fonksiyonu (CartScreen'den alındı)
const calculateDiscount = (totalPrice, discount) => {
  if (!discount || !totalPrice || totalPrice <= 0) return 0;
  
  let discountAmount = 0;
  if (discount.indirim_tipi === 'yuzde') {
    // indirim_degeri'yi parseFloat ile parse et
    const indirimDegeri = parseFloat(discount.indirim_degeri) || 0;
    discountAmount = (totalPrice * indirimDegeri) / 100;
  } else if (discount.indirim_tipi === 'miktar') {
    discountAmount = parseFloat(discount.indirim_degeri) || 0;
    if (discountAmount > totalPrice) {
      discountAmount = totalPrice;
    }
  }
  return Math.max(0, Math.min(discountAmount, totalPrice));
};

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order, orderDetails } = route.params;
  
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
  const [orderDiscounts, setOrderDiscounts] = useState([]); // Sipariş için kullanılan indirimler
  const [kampanyaUrunleriMap, setKampanyaUrunleriMap] = useState({}); // kampanya_urunleri map
  const [loadingDiscounts, setLoadingDiscounts] = useState(true); // İndirimler yükleniyor mu?

  // Geri buton handler - OrderStatus'a git
  const handleGoBack = () => {
    navigation.navigate('Siparişlerim', {
      screen: 'OrderStatusMain'
    });
  };

  // Hardware back button handler - OrderStatus'a git
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('Siparişlerim', {
        screen: 'OrderStatusMain'
      });
      return true; // Event'i handle ettik
    });

    return () => backHandler.remove();
  }, [navigation]);

  // Sipariş detaylarını urun_id ile birlikte yeniden yükle
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        const { data: details, error } = await supabase
          .from(TABLES.SIPARIS_DETAYLARI)
          .select(`
            *,
            urunler (
              id,
              ad,
              fiyat,
              kategori_id,
              yeni_urun,
              populer
            )
          `)
          .eq('siparis_id', currentOrder.id);
        
        if (error) {
          console.error('Sipariş detayları yükleme hatası:', error);
          return;
        }
        
        if (details && details.length > 0) {
          console.log('Sipariş detayları yüklendi (urun_id ile):', details.length);
          setCurrentOrderDetails(details);
        }
      } catch (error) {
        console.error('Sipariş detayları yükleme hatası:', error);
      }
    };
    
    if (currentOrder.id) {
      loadOrderDetails();
    }
  }, [currentOrder.id]);

  // Sipariş için kullanılan indirimleri yükle
  useEffect(() => {
    const loadOrderDiscounts = async () => {
      setLoadingDiscounts(true);
      try {
        // Sipariş için kullanılan indirimleri getir
        const { data: discountUsages, error: usageError } = await supabase
          .from('kullanici_indirim_kullanimlari')
          .select(`
            *,
            indirimler (
              *,
              kampanyalar (
                id,
                ad,
                baslangic_tarihi,
                bitis_tarihi,
                aktif
              )
            )
          `)
          .eq('siparis_id', currentOrder.id);

        if (usageError) {
          console.error('İndirim kullanımları yükleme hatası:', usageError);
          return;
        }

        if (discountUsages && discountUsages.length > 0) {
          console.log('İndirim kullanımları yüklendi:', discountUsages.length);
          
          // kampanya_urunleri tablosunu sorgula
          const indirimIds = discountUsages.map(du => du.indirim_id).filter(id => id != null);
          
          if (indirimIds.length > 0) {
            const { data: kampanyaUrunleriData } = await supabase
              .from('kampanya_urunleri')
              .select('indirim_id, urun_id, kategori_id')
              .in('indirim_id', indirimIds);
            
            console.log('kampanya_urunleri yüklendi:', kampanyaUrunleriData?.length || 0);
            
            // İndirim ID'lerine göre kampanya_urunleri'ni grupla
            const indirimUrunleriMap = {};
            if (kampanyaUrunleriData) {
              kampanyaUrunleriData.forEach(ku => {
                if (ku.indirim_id) {
                  if (!indirimUrunleriMap[ku.indirim_id]) {
                    indirimUrunleriMap[ku.indirim_id] = {
                      urun_ids: [],
                      kategori_ids: []
                    };
                  }
                  if (ku.urun_id) {
                    indirimUrunleriMap[ku.indirim_id].urun_ids.push(ku.urun_id);
                  }
                  if (ku.kategori_id) {
                    indirimUrunleriMap[ku.indirim_id].kategori_ids.push(ku.kategori_id);
                  }
                }
              });
            }
            
            console.log('kampanya_urunleri map:', indirimUrunleriMap);
            setKampanyaUrunleriMap(indirimUrunleriMap);
          }
          
          // İndirim bilgilerini formatla
          const formattedDiscounts = discountUsages.map(du => ({
            indirim_id: du.indirim_id,
            kampanya_adi: du.indirimler?.kampanyalar?.ad || 'İndirim',
            indirim_tipi: du.indirimler?.indirim_tipi,
            indirim_degeri: parseFloat(du.indirimler?.indirim_degeri || 0),
            hedef_tipi: du.indirimler?.hedef_tipi || 'genel',
            urun_filtre_tipi: du.indirimler?.urun_filtre_tipi,
            urun_id: du.indirimler?.urun_id,
            kategori_id: du.indirimler?.kategori_id,
            kullanilan_tutar: parseFloat(du.kullanilan_tutar || 0),
            indirim_miktari: parseFloat(du.indirim_miktari || 0),
            aktif: du.indirimler?.aktif !== false
          }));
          
          console.log('Formatlanmış indirimler:', formattedDiscounts);
          setOrderDiscounts(formattedDiscounts);
        } else {
          console.log('İndirim kullanımı bulunamadı');
        }
      } catch (error) {
        console.error('İndirim yükleme hatası:', error);
      } finally {
        setLoadingDiscounts(false);
      }
    };

    if (currentOrder.id) {
      loadOrderDiscounts();
    }
  }, [currentOrder.id]);

  // Realtime subscription for order updates
  useEffect(() => {
    // Önceki subscription'ı temizle
    const channelName = 'order-detail-updates';
    const existingChannel = supabase.channel(channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const createSubscription = () => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'siparisler'
          },
          (payload) => {
            console.log('OrderDetailScreen sipariş realtime güncelleme:', payload);
            
            // Sadece bu siparişin güncellemelerini dinle
            if (payload.new && payload.new.id === currentOrder.id) {
              console.log('Bu sipariş güncellendi:', payload.new);
              setCurrentOrder(payload.new);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'siparis_detaylari'
          },
          (payload) => {
            console.log('OrderDetailScreen sipariş detayı realtime güncelleme:', payload);
            
            // Bu siparişin detaylarını güncelle
            if (payload.new && payload.new.siparis_id === currentOrder.id) {
              console.log('Bu siparişin detayı güncellendi:', payload.new);
              
              // Local state'i güncelle
              setCurrentOrderDetails(prevDetails => 
                prevDetails.map(detail => 
                  detail.id === payload.new.id ? { ...detail, ...payload.new } : detail
                )
              );
            } else if (payload.old && payload.old.siparis_id === currentOrder.id) {
              console.log('Bu siparişin detayı silindi:', payload.old);
              
              // Silinen detayı local state'den çıkar
              setCurrentOrderDetails(prevDetails => 
                prevDetails.filter(detail => detail.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('OrderDetailScreen subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('OrderDetailScreen realtime subscription başarılı');
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('OrderDetailScreen subscription hatası');
            handleSubscriptionError();
          } else if (status === 'TIMED_OUT') {
            console.warn('OrderDetailScreen subscription timeout');
            handleSubscriptionError();
          }
        });

      return channel;
    };

    const handleSubscriptionError = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`OrderDetailScreen subscription yeniden deneniyor (${retryCount}/${maxRetries})`);
        setTimeout(() => {
          createSubscription();
        }, 2000 * retryCount);
      } else {
        console.error('OrderDetailScreen subscription maksimum retry sayısına ulaştı');
      }
    };

    const channel = createSubscription();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrder.id]);

  const getStatusInfo = (status) => {
    const statusMap = {
      beklemede: { label: 'Beklemede', color: '#F59E0B' },
      hazirlaniyor: { label: 'Hazırlanıyor', color: '#3B82F6' },
      hazir: { label: 'Hazır', color: '#10B981' },
      teslim_edildi: { label: 'Teslim Edildi', color: '#8B5CF6' },
      odeme_yapildi: { label: 'Ödeme Yapıldı', color: '#10B981' },
      odeme_yapilmadi: { label: 'Ödeme Yapılmadı', color: '#F59E0B' },
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
    if (!dateString) return '';
    // Supabase'den gelen timestamp'i parse et
    // PostgreSQL TIMESTAMP WITHOUT TIME ZONE Supabase'de UTC olarak saklanır
    const dateStr = String(dateString).trim();
    let date;
    
    // Eğer timezone bilgisi yoksa (Z, +, - yoksa), UTC olarak kabul et
    if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
      // UTC olarak parse et
      date = new Date(dateStr + 'Z');
    } else if (!dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
      // Eğer sadece tarih-saat formatındaysa (örn: "2024-02-02 10:45:00"), UTC olarak parse et
      date = new Date(dateStr.replace(' ', 'T') + 'Z');
    } else {
      date = new Date(dateStr);
    }
    
    // Türkiye saati için timezone belirt (UTC+3)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul'
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
  };
    
  // editedQuantities veya deletedItems değiştiğinde toplam tutarı güncelle
  useEffect(() => {
    if (currentOrderDetails.length > 0) {
    updateTotalAmount();
    }
  }, [editedQuantities, deletedItems, currentOrderDetails, orderDiscounts, updateTotalAmount]);

  // Ürün için uygun indirimi bul
  const getDiscountForItem = useCallback((item) => {
    // Debug: İndirimleri kontrol et
    if (orderDiscounts.length === 0) {
      console.log('getDiscountForItem: orderDiscounts boş', { 
        itemKeys: Object.keys(item),
        itemUrunId: item.urun_id,
        itemUrunlerId: item.urunler?.id,
        itemName: item.urunler?.ad 
      });
      return null;
    }
    
    // Sipariş detaylarında urun_id direkt olarak var olabilir veya urunler join'inde id olabilir
    // Önce urun_id'yi kontrol et (direkt alan), sonra urunler.id'yi kontrol et (join edilmiş)
    const urunId = item.urun_id ?? item.urunler?.id;
    const kategoriId = item.urunler?.kategori_id;
    
    // Eğer hala urunId yoksa, item yapısını logla
    if (!urunId) {
      console.warn('getDiscountForItem: urunId bulunamadı!', {
        itemKeys: Object.keys(item),
        itemUrunId: item.urun_id,
        itemUrunler: item.urunler,
        itemUrunlerId: item.urunler?.id
      });
    }
    
    console.log('getDiscountForItem: Ürün kontrolü', {
      urunId,
      kategoriId,
      itemKeys: Object.keys(item),
      itemUrunId: item.urun_id,
      itemUrunler: item.urunler,
      orderDiscountsCount: orderDiscounts.length,
      orderDiscounts: orderDiscounts.map(d => ({ id: d.indirim_id, hedef: d.hedef_tipi, urun_filtre: d.urun_filtre_tipi, urun_id: d.urun_id }))
    });
    
    // Önce ürün bazlı indirimleri kontrol et
    for (const discount of orderDiscounts) {
      if (!discount.aktif) continue;
      
      // Genel indirimleri atla (onları en son kontrol edeceğiz)
      if (discount.hedef_tipi === 'genel' && !discount.urun_filtre_tipi) {
        continue;
      }
      
      // kampanya_urunleri kontrolü
      const kampanyaUrunleri = kampanyaUrunleriMap[discount.indirim_id];
      if (kampanyaUrunleri) {
        const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(urunId);
        const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (kategoriId && kampanyaUrunleri.kategori_ids.includes(kategoriId));
        
        console.log('getDiscountForItem: kampanya_urunleri kontrolü', {
          indirim_id: discount.indirim_id,
          urunId,
          kategoriId,
          kampanyaUrunleri,
          urunVar,
          kategoriVar
        });
        
        if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
          if (urunVar || kategoriVar) {
            console.log('getDiscountForItem: kampanya_urunleri ile indirim bulundu (hem ürün hem kategori)', { discount });
            return discount;
          }
        } else if (kampanyaUrunleri.urun_ids.length > 0) {
          if (urunVar) {
            console.log('getDiscountForItem: kampanya_urunleri ile indirim bulundu (sadece ürün)', { discount });
            return discount;
          }
        } else if (kampanyaUrunleri.kategori_ids.length > 0) {
          if (kategoriVar) {
            console.log('getDiscountForItem: kampanya_urunleri ile indirim bulundu (sadece kategori)', { discount });
            return discount;
          }
        } else {
          console.log('getDiscountForItem: kampanya_urunleri ile indirim bulundu (filtre yok)', { discount });
          return discount;
        }
      } else {
        // kampanya_urunleri yoksa, indirimler tablosundaki filtreye göre kontrol et
        if (discount.urun_filtre_tipi === 'urun' && discount.urun_id === urunId) {
          console.log('getDiscountForItem: Ürün bazlı indirim bulundu (kampanya_urunleri yok)', { discount, urunId, discount_urun_id: discount.urun_id });
          return discount;
        }
        if (discount.urun_filtre_tipi === 'kategori' && discount.kategori_id === kategoriId) {
          console.log('getDiscountForItem: Kategori bazlı indirim bulundu', { discount, kategoriId });
          return discount;
        }
        if (discount.urun_filtre_tipi === 'yeni_urun' && item.urunler?.yeni_urun === true) {
          console.log('getDiscountForItem: Yeni ürün indirimi bulundu', { discount });
          return discount;
        }
        if (discount.urun_filtre_tipi === 'populer_urun' && item.urunler?.populer === true) {
          console.log('getDiscountForItem: Popüler ürün indirimi bulundu', { discount });
          return discount;
        }
      }
    }
    
    // Ürün bazlı indirim yoksa, genel indirimi kontrol et
    const genelDiscount = orderDiscounts.find(d => d.hedef_tipi === 'genel' && d.aktif);
    if (genelDiscount) {
      // Genel indirimin bu ürüne uygulanıp uygulanmayacağını kontrol et
      const kampanyaUrunleri = kampanyaUrunleriMap[genelDiscount.indirim_id];
      if (kampanyaUrunleri) {
        const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(urunId);
        const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (kategoriId && kampanyaUrunleri.kategori_ids.includes(kategoriId));
        
        if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
          if (urunVar || kategoriVar) {
            return genelDiscount;
          }
        } else if (kampanyaUrunleri.urun_ids.length > 0) {
          if (urunVar) {
            return genelDiscount;
          }
        } else if (kampanyaUrunleri.kategori_ids.length > 0) {
          if (kategoriVar) {
            return genelDiscount;
          }
        } else {
          return genelDiscount;
        }
      } else {
        // kampanya_urunleri yoksa ve urun_filtre_tipi yoksa, genel indirim tüm ürünlere uygulanabilir
        if (!genelDiscount.urun_filtre_tipi) {
          console.log('getDiscountForItem: Genel indirim bulundu (tüm ürünlere, filtre yok)', { discount: genelDiscount });
          return genelDiscount;
        }
        // Eğer genel indirimde ürün filtresi varsa kontrol et
        if (genelDiscount.urun_filtre_tipi === 'urun' && genelDiscount.urun_id === urunId) {
          console.log('getDiscountForItem: Genel indirim (ürün filtresi) bulundu', { discount: genelDiscount, urunId });
          return genelDiscount;
        }
        if (genelDiscount.urun_filtre_tipi === 'kategori' && genelDiscount.kategori_id === kategoriId) {
          console.log('getDiscountForItem: Genel indirim (kategori filtresi) bulundu', { discount: genelDiscount, kategoriId });
          return genelDiscount;
        }
        if (genelDiscount.urun_filtre_tipi === 'yeni_urun' && item.urunler?.yeni_urun === true) {
          console.log('getDiscountForItem: Genel indirim (yeni ürün) bulundu', { discount: genelDiscount });
          return genelDiscount;
        }
        if (genelDiscount.urun_filtre_tipi === 'populer_urun' && item.urunler?.populer === true) {
          console.log('getDiscountForItem: Genel indirim (popüler ürün) bulundu', { discount: genelDiscount });
          return genelDiscount;
        }
      }
    }
    
    console.log('getDiscountForItem: İndirim bulunamadı', { urunId, kategoriId });
    return null;
  }, [orderDiscounts, kampanyaUrunleriMap]);

  // Toplam tutarı güncelleme fonksiyonu (indirimleri koruyarak)
  const updateTotalAmount = useCallback(() => {
    // Her ürün için indirimli fiyatı hesapla ve topla
    const newDiscountedTotal = currentOrderDetails
      .filter(detail => !deletedItems.includes(detail.id)) // Silinen ürünleri çıkar
      .reduce((sum, detail) => {
        const adet = editedQuantities[detail.id] || detail.adet;
        const priceInfo = getItemDiscountedPrice(detail, adet);
        
        console.log('updateTotalAmount: Ürün hesaplama', {
          id: detail.id,
          urunId: detail.urun_id || detail.urunler?.id,
          ad: detail.urunler?.ad,
          adet: adet,
          originalPrice: priceInfo.originalPrice,
          discountAmount: priceInfo.discountAmount,
          discountedPrice: priceInfo.discountedPrice,
          hasDiscount: priceInfo.hasDiscount,
          sum: sum
        });
        
        return sum + priceInfo.discountedPrice;
      }, 0);
    
    console.log('updateTotalAmount: Yeni toplam tutar', newDiscountedTotal);
    setCurrentOrder(prev => ({ ...prev, toplam_tutar: newDiscountedTotal }));
  }, [currentOrderDetails, editedQuantities, deletedItems, orderDiscounts, kampanyaUrunleriMap, getItemDiscountedPrice]);

  // Ürün silme fonksiyonu
  const handleDeleteItem = (itemId) => {
    setDeletedItems(prev => [...prev, itemId]);
    setHasChanges(true);
  };

  // Silinen ürünü geri alma fonksiyonu
  const handleRestoreItem = (itemId) => {
    setDeletedItems(prev => prev.filter(id => id !== itemId));
    setHasChanges(true);
  };

  // Kaydet modalını açma
  const handleSaveChanges = () => {
    setShowSaveModal(true);
  };

  const hideSaveModal = () => {
    setShowSaveModal(false);
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

      // Her ürün için indirimli fiyatı hesapla ve topla
      const newDiscountedTotal = updatedDetails.reduce((sum, detail) => {
        const adet = editedQuantities[detail.id] || detail.adet;
        const priceInfo = getItemDiscountedPrice(detail, adet);
        
        console.log('Ürün indirim hesaplama:', {
          id: detail.id,
          ad: detail.urunler?.ad,
          adet: adet,
          originalPrice: priceInfo.originalPrice,
          discountAmount: priceInfo.discountAmount,
          discountedPrice: priceInfo.discountedPrice,
          hasDiscount: priceInfo.hasDiscount,
          discount: priceInfo.discount
        });
        
        return sum + priceInfo.discountedPrice;
      }, 0);
      
      console.log('Final newTotal (indirimli):', newDiscountedTotal);
      
      // Sipariş toplam tutarını güncelle (indirimli toplam)
      const { error: orderUpdateError } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ toplam_tutar: newDiscountedTotal || 0 })
        .eq('id', currentOrder.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      // State'leri güncelle
      setCurrentOrderDetails(updatedDetails);
      setCurrentOrder(prev => ({ ...prev, toplam_tutar: newDiscountedTotal }));
      setEditedQuantities({});
      setDeletedItems([]);
      setHasChanges(false);
      hideSaveModal();

      // OrderStatus sayfasına yönlendir
      navigation.navigate('OrderStatusMain', { 
        order: { ...currentOrder, toplam_tutar: newDiscountedTotal },
        orderDetails: updatedDetails 
      });

    } catch (error) {
      console.error('Değişiklik kaydetme hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: `Değişiklikler kaydedilirken bir hata oluştu: ${error.message}`,
        position: 'top',
        visibilityTime: 4000,
      });
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

      console.log('Notlar güncellendi, realtime tetiklenecek:', { 
        orderId: currentOrder.id, 
        newNotes: notesText 
      });

      // State'de güncelle
      setCurrentOrder(prev => ({ ...prev, aciklama: notesText }));
      setIsEditingNotes(false);
      Alert.alert('Başarılı', 'Notlar güncellendi.');

    } catch (error) {
      console.error('Not kaydetme hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: `Notlar kaydedilirken bir hata oluştu: ${error.message}`,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handleCancelEditNotes = () => {
    setNotesText(currentOrder.aciklama || '');
    setIsEditingNotes(false);
  };

  // Modal animasyon fonksiyonları
  const showModal = () => {
    setShowCancelModal(true);
  };

  const hideModal = () => {
    setShowCancelModal(false);
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
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: `Sipariş iptal edilirken bir hata oluştu: ${error.message}`,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  // Modalı kapatma
  const closeCancelModal = () => {
    hideModal();
  };



  // Ürün için indirimli fiyatı hesapla
  const getItemDiscountedPrice = useCallback((item, quantity) => {
    // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
    let birimFiyat = parseFloat(item.birim_fiyat) || 0;
    if (birimFiyat === 0 && item.urunler?.fiyat) {
      birimFiyat = parseFloat(item.urunler.fiyat) || 0;
    }
    
    // Orijinal toplam fiyat (indirim öncesi)
    const originalTotalPrice = birimFiyat * quantity;
    
    // Bu ürün için uygun indirimi bul
    const discount = getDiscountForItem(item);
    
    if (discount) {
      // İndirimi hesapla
      const itemDiscount = calculateDiscount(originalTotalPrice, discount);
      const discountedPrice = Math.max(0, originalTotalPrice - itemDiscount);
      
      // İndirim varsa ve indirim miktarı 0'dan büyükse hasDiscount: true
      const hasDiscount = itemDiscount > 0;
      
      console.log('getItemDiscountedPrice: İndirim hesaplandı', {
        urunId: item.urun_id || item.urunler?.id,
        ad: item.urunler?.ad,
        quantity,
        originalTotalPrice,
        itemDiscount,
        discountedPrice,
        hasDiscount,
        discount: discount ? { id: discount.indirim_id, tip: discount.indirim_tipi, deger: discount.indirim_degeri } : null
      });
      
      return {
        originalPrice: originalTotalPrice,
        discountedPrice: discountedPrice,
        discountAmount: itemDiscount,
        hasDiscount: hasDiscount,
        discount: discount
      };
    }
    
    console.log('getItemDiscountedPrice: İndirim bulunamadı', {
      urunId: item.urun_id || item.urunler?.id,
      ad: item.urunler?.ad,
      quantity,
      originalTotalPrice,
      orderDiscountsCount: orderDiscounts.length,
      orderDiscounts: orderDiscounts.map(d => ({ id: d.indirim_id, urun_id: d.urun_id, urun_filtre: d.urun_filtre_tipi }))
    });
    
    return {
      originalPrice: originalTotalPrice,
      discountedPrice: originalTotalPrice,
      discountAmount: 0,
      hasDiscount: false,
      discount: null
    };
  }, [getDiscountForItem, orderDiscounts]);

  const renderOrderItem = (item) => {
    const currentQuantity = editedQuantities[item.id] || item.adet;
    const isDeleted = deletedItems.includes(item.id);
    
    // İndirimli fiyatı hesapla
    const priceInfo = getItemDiscountedPrice(item, currentQuantity);
    
    if (isDeleted) {
      return (
        <View key={item.id} style={[styles.orderItem, styles.deletedItem]}>
          <View style={styles.itemInfo}>
            <Text style={styles.deletedItemName}>{item.urunler?.ad || 'Ürün'}</Text>
            <Text style={styles.deletedItemQuantity}>x{currentQuantity} - Silinecek</Text>
          </View>
          <View style={styles.itemActions}>
            {priceInfo.hasDiscount ? (
              <>
                <Text style={styles.deletedItemPriceOriginal}>
                  {formatPrice(priceInfo.originalPrice)}
                </Text>
                <Text style={styles.deletedItemPrice}>
                  {formatPrice(priceInfo.discountedPrice)}
                </Text>
              </>
            ) : (
              <Text style={styles.deletedItemPrice}>
                {formatPrice(priceInfo.discountedPrice)}
              </Text>
            )}
            
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
          {priceInfo.hasDiscount ? (
            <View style={styles.itemPriceContainer}>
              <Text style={styles.itemPriceOriginal}>
                {formatPrice(priceInfo.originalPrice)}
              </Text>
              <Text style={styles.itemPrice}>
                {formatPrice(priceInfo.discountedPrice)}
              </Text>
            </View>
          ) : (
            <Text style={styles.itemPrice}>
              {formatPrice(priceInfo.discountedPrice)}
            </Text>
          )}
          
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
         
          </View>
        </View>

        {/* Sipariş Detayları */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Sipariş Detayları</Text>
          {currentOrderDetails.map(renderOrderItem)}
          
          {/* İndirim bilgisini hesapla - sipariş detaylarından */}
          {loadingDiscounts ? (
            <View style={styles.discountLoadingContainer}>
              <ActivityIndicator size="small" color="#8B4513" />
              <Text style={styles.discountLoadingText}>İndirimler hesaplanıyor...</Text>
            </View>
          ) : (() => {
            // Ara toplamı hesapla - sipariş detaylarındaki toplam fiyatları topla (indirim öncesi)
            const araToplamHesaplanan = currentOrderDetails
              .filter(detail => !deletedItems.includes(detail.id))
              .reduce((sum, detail) => {
                // Fiyat hesaplama - önce birim_fiyat, sonra urunler.fiyat kullan
                let birimFiyat = parseFloat(detail.birim_fiyat) || 0;
                if (birimFiyat === 0 && detail.urunler?.fiyat) {
                  birimFiyat = parseFloat(detail.urunler.fiyat) || 0;
                }
                const adet = editedQuantities[detail.id] || detail.adet;
                return sum + (birimFiyat * adet);
              }, 0);
            
            // İndirimli toplamı hesapla - her ürün için indirimli fiyatı hesapla ve topla
            const indirimliToplam = currentOrderDetails
              .filter(detail => !deletedItems.includes(detail.id))
              .reduce((sum, detail) => {
                const adet = editedQuantities[detail.id] || detail.adet;
                const priceInfo = getItemDiscountedPrice(detail, adet);
                return sum + priceInfo.discountedPrice;
              }, 0);
            
            // İndirim miktarı = ara toplam - indirimli toplam
            const indirimMiktari = araToplamHesaplanan > indirimliToplam
              ? araToplamHesaplanan - indirimliToplam
              : 0;
            
            // Ara toplam (indirim öncesi)
            const araToplam = araToplamHesaplanan;
            
            // Toplam tutar = indirimli toplam
            const toplamTutar = indirimliToplam;
            
            return (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Ara Toplam:</Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(araToplam)}
                  </Text>
                </View>
                {indirimMiktari > 0 && (
                  <View style={styles.discountRow}>
                    <View style={styles.discountInfo}>
                      <Ionicons name="pricetag" size={16} color="#10B981" />
                      <Text style={styles.discountLabel}>İndirim</Text>
                    </View>
                    <Text style={styles.discountAmount}>
                      -{formatPrice(indirimMiktari)}
                    </Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Toplam Tutar:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(toplamTutar)}
                  </Text>
                </View>
              </>
            );
          })()}
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
              style={[
                styles.notesDisplayContainer,
                currentOrder.durum !== 'beklemede' && styles.notesDisplayContainerDisabled
              ]}
              onPress={() => {
                if (currentOrder.durum !== 'beklemede') {
                  Alert.alert('Uyarı', 'Sadece beklemede olan siparişlerin notları değiştirilebilir.');
                  return;
                }
                setIsEditingNotes(true);
              }}
              disabled={currentOrder.durum !== 'beklemede'}
            >
              <Text style={[
                styles.notesText,
                currentOrder.durum !== 'beklemede' && styles.notesTextDisabled
              ]}>
                {currentOrder.aciklama || (currentOrder.durum === 'beklemede' ? 'Not eklemek için dokunun...' : 'Notlar düzenlenemez')}
              </Text>
              <Ionicons 
                name="create-outline" 
                size={20} 
                color={currentOrder.durum === 'beklemede' ? "#9CA3AF" : "#D1D5DB"} 
              />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
          </View>
        </View>
      )}

      {/* Kaydet Modalı */}
      {showSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
          </View>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 12,
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
  scrollContent: {
    paddingBottom: 40,
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
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'System',
  },
  itemPriceOriginal: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
    marginBottom: 2,
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
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  discountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'System',
  },
  discountAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    fontFamily: 'System',
  },
  discountLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    marginTop: 16,
  },
  discountLoadingText: {
    fontSize: 14,
    color: '#6B7280',
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
  notesTextDisabled: {
    color: '#D1D5DB',
  },
  notesDisplayContainerDisabled: {
    opacity: 0.6,
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
  deletedItemPriceOriginal: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
    marginBottom: 2,
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
