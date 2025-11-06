import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { sendPushNotificationToTokens } from '../utils/pushNotification';

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
    color: '#8B5CF6', 
    bgColor: '#EDE9FE'
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
  const [selectedFilter, setSelectedFilter] = useState('beklemede');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localMasaOrders, setLocalMasaOrders] = useState(masaOrders);
  const [updateQueue, setUpdateQueue] = useState([]);
  const updateTimeoutRef = React.useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const lastUpdateRef = React.useRef(Date.now());
  
  // Ref'ler - closure sorununu önlemek için
  const masaNoRef = React.useRef(masaNo);
  const showOrderModalRef = React.useRef(showOrderModal);
  const selectedOrderRef = React.useRef(selectedOrder);

  // Component mount olduğunda başlangıç zamanını kaydet
  React.useEffect(() => {
    lastUpdateRef.current = Date.now();
  }, []);

  // Ref'leri güncel tut
  React.useEffect(() => {
    masaNoRef.current = masaNo;
  }, [masaNo]);

  React.useEffect(() => {
    showOrderModalRef.current = showOrderModal;
  }, [showOrderModal]);

  React.useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  // Filtreleme fonksiyonu
  const filterOrders = () => {
    let filtered = [...localMasaOrders];
    
    filtered = filtered.filter(order => order.durum === selectedFilter);
    
    setFilteredOrders(filtered);
  };

  // Her durum için sipariş sayısını hesapla
  const getOrderCountByStatus = (status) => {
    return localMasaOrders.filter(order => order.durum === status).length;
  };

  // Local masa orders güncellendiğinde filtrele
  React.useEffect(() => {
    filterOrders();
  }, [localMasaOrders, selectedFilter]);

  // Sipariş detaylarını yükle
  const loadOrderDetails = React.useCallback(async (orderId) => {
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

      // Local state'i güncelle - mevcut order bilgilerini koru
      setLocalMasaOrders(prevOrders => {
        const existingOrder = prevOrders.find(o => o.id === orderId);
        if (!existingOrder) {
          // Order bulunamadı, yeni sipariş olabilir - bu durumda sadece siparis_detaylari eklenemez
          console.warn('loadOrderDetails: Order bulunamadı, orderId:', orderId);
          return prevOrders;
        }
        
        return prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, siparis_detaylari: orderDetails }
            : order
        );
      });

      // Eğer modal açıksa ve bu sipariş modal'daki sipariş ise, selectedOrder'ı da güncelle
      // ÖNEMLİ: Sadece siparis_detaylari güncelle, durum ve diğer alanları koru
      if (showOrderModal && selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prevSelected => {
          console.log('loadOrderDetails: selectedOrder güncelleniyor, mevcut durum:', prevSelected.durum);
          return {
            ...prevSelected,
            siparis_detaylari: orderDetails
            // durum ve diğer alanlar korunuyor (spread operator ile)
          };
        });
      }
    } catch (error) {
      console.error('Sipariş detayları yüklenirken hata:', error);
    }
  }, [showOrderModal, selectedOrder]);

  // Props değiştiğinde local state'i güncelle ve sipariş detaylarını yükle
  React.useEffect(() => {
    // Mevcut localMasaOrders ile yeni masaOrders'ı merge et - veri kaybını önle
    setLocalMasaOrders(prevOrders => {
      if (!masaOrders || masaOrders.length === 0) {
        return prevOrders;
      }
      
      // Yeni ve güncellenmiş siparişleri birleştir
      const mergedOrders = masaOrders.map(newOrder => {
        const existingOrder = prevOrders.find(o => o.id === newOrder.id);
        if (existingOrder) {
          // Mevcut sipariş varsa, siparis_detaylari ve durum'u koru ve diğer bilgileri güncelle
          // ÖNEMLİ: durum alanını existingOrder'dan koru (realtime güncellemeleri için)
          return {
            ...existingOrder,
            ...newOrder,
            // durum alanını existingOrder'dan koru (yeni order'daki durum eski olabilir)
            durum: existingOrder.durum,
            // siparis_detaylari koru - eğer yeni order'da yoksa eski değeri kullan
            siparis_detaylari: newOrder.siparis_detaylari || existingOrder.siparis_detaylari
          };
        }
        return newOrder;
      });
      
      // Yeni eklenen siparişleri de ekle (realtime'da eklenen ama masaOrders'da olmayanlar)
      const newOrders = prevOrders.filter(prevOrder => 
        !masaOrders.find(newOrder => newOrder.id === prevOrder.id)
      );
      
      return [...mergedOrders, ...newOrders];
    });
    
    // Props güncellendiğinde connection aktif olduğunu işaretle
    lastUpdateRef.current = Date.now();
    
    // Eğer siparişler varsa ve siparis_detaylari yoksa, yükle
    if (masaOrders && masaOrders.length > 0) {
      masaOrders.forEach(order => {
        if (!order.siparis_detaylari || order.siparis_detaylari.length === 0) {
          loadOrderDetails(order.id);
        }
      });
    }
  }, [masaOrders, loadOrderDetails]);

  // Debounced state update fonksiyonu
  const debouncedUpdateState = React.useCallback((updateFn) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setLocalMasaOrders(updateFn);
      updateTimeoutRef.current = null;
    }, 100); // 100ms debounce
  }, []);

  // Connection monitoring
  React.useEffect(() => {
    const checkConnection = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // 5 dakikadan uzun süredir güncelleme alınmadıysa disconnected olarak işaretle ve subscription'ı yeniden başlat
      if (timeSinceLastUpdate > 300000) { // 5 dakika (300000 ms)
        setConnectionStatus(prevStatus => {
          // Sadece durum değiştiyse (ilk disconnected olduğunda) subscription'ı yeniden başlat
          if (prevStatus !== 'disconnected') {
            console.warn('KasaOrderDetailScreen: Uzun süredir güncelleme alınmadı, subscription yeniden başlatılıyor...');
            
            // Önceki subscription'ı temizle
            const channelName = `kasa-order-updates-${masaNo}`;
            supabase.removeChannel(supabase.channel(channelName));
            
            // lastUpdateRef'i güncelle ki bir sonraki kontrol'de hemen tekrar timeout olmasın
            lastUpdateRef.current = Date.now();
          }
          return 'disconnected';
        });
      } else {
        setConnectionStatus('connected');
      }
    };

    // İlk kontrol
    checkConnection();
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [masaNo]); // masaNo dependency eklendi

  // Realtime subscription for order updates
  React.useEffect(() => {
    console.log('KasaOrderDetailScreen realtime subscription başlatılıyor, masaNo:', masaNo);
    
    // Önceki subscription'ı temizle
    const channelName = `kasa-order-updates-${masaNo}`;
    const existingChannel = supabase.channel(channelName);
    supabase.removeChannel(existingChannel);
    
    // Subscription başlatıldığında connection aktif olduğunu işaretle
    lastUpdateRef.current = Date.now();
    
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
          // Ref'lerden güncel değerleri al
          const currentMasaNo = masaNoRef.current;
          
          console.log('KasaOrderDetailScreen sipariş realtime güncelleme:', payload);
          console.log('Mevcut masaNo:', currentMasaNo);
          // Her realtime event'te connection aktif olduğunu göster (bu masaya ait olsun ya da olmasın)
          lastUpdateRef.current = Date.now();
          
          // Sadece bu masanın siparişlerini güncelle
          if (payload.new) {
            const updatedOrder = payload.new;
            const masaId = updatedOrder.masa_id;
            
            console.log('Güncellenen sipariş masa_id:', masaId);
            console.log('Bu masaNo:', currentMasaNo);
            console.log('Event type:', payload.eventType);
            
            // Bu masanın siparişlerini kontrol et - local state'teki order'ların masa_id'si ile karşılaştır
            // masa_id integer, masa_no string ("Masa X") - doğrudan karşılaştırma yapamayız
            // Local state'teki order'larda zaten masa_id var, onu kullanarak kontrol edelim
            setLocalMasaOrders(prevOrders => {
              // Local state'te bu masa_id'ye sahip bir order var mı kontrol et
              const hasOrderWithThisMasaId = prevOrders.some(order => order.masa_id === masaId);
              const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
              
              // Eğer bu masa_id'ye sahip order varsa veya güncellenen order zaten varsa, işle
              // Yeni sipariş (INSERT) için: local state'te bu masa_id'ye sahip order varsa veya local state boşsa ekle
              if (hasOrderWithThisMasaId || orderExists || (payload.eventType === 'INSERT' && prevOrders.length === 0)) {
                console.log('Bu masanın siparişi güncellendi:', updatedOrder);
                
                // İptal durumu özel kontrolü
                if (updatedOrder.durum === 'iptal') {
                  console.log('Bu masanın siparişi iptal edildi:', updatedOrder);
                }
                
                // Notlar güncelleme kontrolü
                if (updatedOrder.aciklama !== undefined) {
                  console.log('Bu masanın sipariş notları güncellendi:', {
                    orderId: updatedOrder.id,
                    newNotes: updatedOrder.aciklama
                  });
                }
                
                console.log('Önceki orders:', prevOrders.map(o => ({ id: o.id, masa_id: o.masa_id })));
                
                // Yeni sipariş oluşturulduysa (INSERT), listeye ekle
                if (payload.eventType === 'INSERT') {
                  console.log('Yeni sipariş eklendi:', updatedOrder);
                  const updated = [...prevOrders, updatedOrder];
                  console.log('Güncellenmiş orders (yeni eklendi):', updated.map(o => ({ id: o.id, masa_id: o.masa_id })));
                  
                  // Yeni siparişin detaylarını hemen yükle (realtime için)
                  if (!updatedOrder.siparis_detaylari || updatedOrder.siparis_detaylari.length === 0) {
                    loadOrderDetails(updatedOrder.id);
                  }
                  
                  return updated;
                } else {
                // Mevcut sipariş güncellendi (UPDATE), güncelle
                // ÖNEMLİ: siparis_detaylari ve diğer nested objeleri koru
                const updated = prevOrders.map(order => {
                  if (order.id === updatedOrder.id) {
                    // Realtime güncellemesi geldiğinde, updatedOrder'daki tüm alanları kullan
                    // ÖNEMLİ: durum alanını mutlaka updatedOrder'dan al (undefined olsa bile, çünkü bu bir UPDATE event'i)
                    const updatedOrderData = {
                      ...order,
                      ...updatedOrder,
                      // durum alanını mutlaka updatedOrder'dan al
                      durum: updatedOrder.durum !== undefined ? updatedOrder.durum : order.durum,
                      // siparis_detaylari koru - eğer updatedOrder'da yoksa eski değeri kullan
                      siparis_detaylari: updatedOrder.siparis_detaylari !== undefined 
                        ? updatedOrder.siparis_detaylari 
                        : order.siparis_detaylari
                    };
                    console.log('Order güncelleniyor (realtime):', {
                      orderId: order.id,
                      eskiDurum: order.durum,
                      yeniDurum: updatedOrder.durum,
                      updatedOrderDurum: updatedOrder.durum,
                      finalDurum: updatedOrderData.durum
                    });
                    return updatedOrderData;
                  }
                  return order;
                });
                console.log('Güncellenmiş orders (güncellendi):', updated.map(o => ({ id: o.id, masa_id: o.masa_id, durum: o.durum })));
                return updated;
                }
              } else {
                console.log('Bu sipariş bu masaya ait değil, güncelleme yapılmadı');
                return prevOrders;
              }
            });
            
            // Eğer modal açıksa ve güncellenen sipariş modal'daki sipariş ise, selectedOrder'ı da güncelle
            setLocalMasaOrders(prevOrders => {
              const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
              if (orderExists) {
                setSelectedOrder(prevSelected => {
                  const currentShowModal = showOrderModalRef.current;
                  if (currentShowModal && prevSelected && prevSelected.id === updatedOrder.id) {
                    console.log('Modal açık, selectedOrder güncelleniyor (realtime):', {
                      orderId: updatedOrder.id,
                      eskiDurum: prevSelected.durum,
                      yeniDurum: updatedOrder.durum
                    });
                    // siparis_detaylari ve durum'u koruyarak güncelle
                    // ÖNEMLİ: durum alanını mutlaka updatedOrder'dan al (undefined olsa bile eski değeri koru)
                    return {
                      ...prevSelected,
                      ...updatedOrder,
                      // durum alanını mutlaka updatedOrder'dan al
                      durum: updatedOrder.durum !== undefined ? updatedOrder.durum : prevSelected.durum,
                      // siparis_detaylari'ı koru
                      siparis_detaylari: prevSelected.siparis_detaylari || []
                    };
                  }
                  return prevSelected;
                });
              }
              return prevOrders;
            });
          } else if (payload.old) {
            // Sipariş silindi (DELETE)
            const deletedOrder = payload.old;
            const masaId = deletedOrder.masa_id;
            
            console.log('Silinen sipariş masa_id:', masaId);
            console.log('Bu masaNo:', currentMasaNo);
            console.log('Event type:', payload.eventType);
            
            // Bu masanın siparişi silinirse, listeden çıkar
            // Local state'teki order'ların masa_id'si ile karşılaştır
            setLocalMasaOrders(prevOrders => {
              const hasOrderWithThisMasaId = prevOrders.some(order => order.masa_id === masaId);
              const orderExists = prevOrders.some(order => order.id === deletedOrder.id);
              
              if (hasOrderWithThisMasaId || orderExists) {
                console.log('Bu masanın siparişi silindi:', deletedOrder);
                console.log('Önceki orders:', prevOrders.map(o => ({ id: o.id, masa_id: o.masa_id })));
                const updated = prevOrders.filter(order => order.id !== deletedOrder.id);
                console.log('Güncellenmiş orders (silindi):', updated.map(o => ({ id: o.id, masa_id: o.masa_id })));
                return updated;
              } else {
                console.log('Bu silinen sipariş bu masaya ait değil, güncelleme yapılmadı');
                return prevOrders;
              }
            });
            
            // Eğer modal açıksa ve silinen sipariş modal'daki sipariş ise, modal'ı kapat
            setLocalMasaOrders(prevOrders => {
              const orderExists = prevOrders.some(order => order.id === deletedOrder.id);
              if (orderExists) {
                const currentShowModal = showOrderModalRef.current;
                const currentSelectedOrder = selectedOrderRef.current;
                if (currentShowModal && currentSelectedOrder && currentSelectedOrder.id === deletedOrder.id) {
                  console.log('Silinen sipariş modal\'da açık, modal kapatılıyor');
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                }
              }
              return prevOrders;
            });
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
          // Ref'lerden güncel değerleri al
          const currentMasaNo = masaNoRef.current;
          
          console.log('KasaOrderDetailScreen sipariş detayı realtime güncelleme:', payload);
          
          // Sadece siparis_detaylari tablosundan gelen event'leri işle
          // siparisler tablosundan gelen event'ler zaten ilk subscription'da işleniyor
          if (payload.table !== 'siparis_detaylari') {
            console.log('Bu event siparis_detaylari tablosundan değil, ignore ediliyor:', payload.table);
            return;
          }
          
          // Her realtime event'te connection aktif olduğunu göster
          lastUpdateRef.current = Date.now();
          
          // Bu masanın siparişlerinin detaylarını güncelle
          if (payload.new) {
            const updatedDetail = payload.new;
            const orderId = updatedDetail.siparis_id;
            
            console.log('Güncellenen detay order ID:', orderId);
            console.log('Mevcut masaNo:', currentMasaNo);
            
            // orderId geçersizse işlemi durdur
            if (!orderId || orderId === 'undefined' || orderId === 'null') {
              console.log('Geçersiz orderId, işlem durduruluyor:', orderId);
              return;
            }
            
            // Local state'ten bu order'ı bul ve masa_id kontrolü yap
            setLocalMasaOrders(prevOrders => {
              const targetOrder = prevOrders.find(order => order.id === orderId);
              if (targetOrder) {
                console.log('Bu masanın sipariş detayı güncellendi:', updatedDetail);
                console.log('Sipariş masa_id:', targetOrder.masa_id, 'Mevcut masaNo:', currentMasaNo);
                
                // Eğer siparis_detaylari yoksa veya urunler bilgisi eksikse, tam detayları yükle
                const targetOrderLocal = prevOrders.find(order => order.id === orderId);
                if (targetOrderLocal && (!targetOrderLocal.siparis_detaylari || targetOrderLocal.siparis_detaylari.length === 0)) {
                  // Sipariş detayları henüz yüklenmemiş, tam detayları yükle (urunler bilgisiyle birlikte)
                  loadOrderDetails(orderId);
                  return prevOrders; // loadOrderDetails içinde güncelleme yapılacak
                }
                
                // Eğer güncellenen detayda urunler bilgisi yoksa, tam detayları yükle
                if (updatedDetail && !updatedDetail.urunler) {
                  // urunler bilgisi eksik, tam detayları yükle
                  loadOrderDetails(orderId);
                  return prevOrders;
                }
                
                const updatedOrders = prevOrders.map(order => 
                  order.id === orderId 
                    ? {
                        ...order,
                        siparis_detaylari: payload.eventType === 'INSERT' 
                          ? [...(order.siparis_detaylari || []), updatedDetail]
                          : order.siparis_detaylari?.map(detail => 
                              detail.id === updatedDetail.id ? { ...detail, ...updatedDetail } : detail
                            ) || []
                      }
                    : order
                );

                // Eğer modal açıksa ve güncellenen sipariş modal'daki sipariş ise, selectedOrder'ı da güncelle
                const currentShowModal = showOrderModalRef.current;
                const currentSelectedOrder = selectedOrderRef.current;
                if (currentShowModal && currentSelectedOrder && currentSelectedOrder.id === orderId) {
                  console.log('Modal açık, selectedOrder sipariş detayı güncelleniyor:', updatedDetail);
                  console.log('Event type:', payload.eventType);
                  
                  setSelectedOrder(prevSelected => ({
                    ...prevSelected,
                    siparis_detaylari: payload.eventType === 'INSERT'
                      ? [...(prevSelected.siparis_detaylari || []), updatedDetail]
                      : prevSelected.siparis_detaylari?.map(detail => 
                          detail.id === updatedDetail.id ? { ...detail, ...updatedDetail } : detail
                        ) || []
                  }));
                }

                return updatedOrders;
              } else {
                console.log('Bu detay bu masaya ait değil, güncelleme yapılmadı');
                console.log('Mevcut orders:', prevOrders.map(o => ({ id: o.id, masa_id: o.masa_id })));
                console.log('Aranan order ID:', orderId);
                
                // Eğer order bulunamadıysa, bu order'ın bu masaya ait olup olmadığını kontrol et
                console.log('Order ID', orderId, 'bulunamadı. Bu order bu masaya ait olabilir ama henüz yüklenmemiş.');
                
                // Order'ın masa_id'sini kontrol et
                if (orderId && orderId !== 'undefined') {
                  checkOrderMasaId(orderId).then(order => {
                    const masaNoNumber = currentMasaNo.replace('Masa ', '');
                    if (order && order.masa_id && order.masa_id.toString() === masaNoNumber) {
                      console.log('Order ID', orderId, 'bu masaya ait ama henüz yüklenmemiş. Sipariş detayları yükleniyor...');
                      // Bu masaya ait sipariş bulundu ama henüz local state'de yok, detayları yükle
                      loadOrderDetails(orderId);
                    } else {
                      console.log('Order ID', orderId, 'bu masaya ait değil. Masa ID:', order?.masa_id, 'Mevcut masa:', currentMasaNo);
                    }
                  });
                } else {
                  console.log('Order ID geçersiz:', orderId, 'Kontrol edilmiyor.');
                }
                
                return prevOrders;
              }
            });
          } else if (payload.old) {
            const deletedDetail = payload.old;
            const orderId = deletedDetail.siparis_id;
            
            console.log('Silinen detay order ID:', orderId);
            console.log('Mevcut masaNo:', currentMasaNo);
            
            // orderId geçersizse işlemi durdur
            if (!orderId || orderId === 'undefined' || orderId === 'null') {
              console.log('Geçersiz orderId, silme işlemi durduruluyor:', orderId);
              return;
            }
            
            // Local state'ten bu order'ı bul ve masa_id kontrolü yap
            setLocalMasaOrders(prevOrders => {
              const targetOrder = prevOrders.find(order => order.id === orderId);
              if (targetOrder) {
                console.log('Bu masanın sipariş detayı silindi:', deletedDetail);
                console.log('Sipariş masa_id:', targetOrder.masa_id, 'Mevcut masaNo:', currentMasaNo);
                
                // masa_id kontrolü - masaId integer, masaNo "Masa X" formatında string
                const masaNoNumber = currentMasaNo.replace('Masa ', '');
                if (!targetOrder.masa_id || targetOrder.masa_id.toString() !== masaNoNumber) {
                  console.log('Bu sipariş bu masaya ait değil, silme işlemi yapılmadı');
                  return prevOrders;
                }
                
                const updatedOrders = prevOrders.map(order => 
                  order.id === orderId 
                    ? {
                        ...order,
                        siparis_detaylari: order.siparis_detaylari?.filter(detail => 
                          detail.id !== deletedDetail.id
                        ) || []
                      }
                    : order
                );

                // Eğer modal açıksa ve silinen sipariş modal'daki sipariş ise, selectedOrder'ı da güncelle
                const currentShowModal = showOrderModalRef.current;
                const currentSelectedOrder = selectedOrderRef.current;
                if (currentShowModal && currentSelectedOrder && currentSelectedOrder.id === orderId) {
                  console.log('Modal açık, selectedOrder sipariş detayı siliniyor:', deletedDetail);
                  setSelectedOrder(prevSelected => ({
                    ...prevSelected,
                    siparis_detaylari: prevSelected.siparis_detaylari?.filter(detail => 
                      detail.id !== deletedDetail.id
                    ) || []
                  }));
                }

                return updatedOrders;
              } else {
                console.log('Bu silinen detay bu masaya ait değil, güncelleme yapılmadı');
                console.log('Mevcut orders:', prevOrders.map(o => ({ id: o.id, masa_id: o.masa_id })));
                return prevOrders;
              }
            });
          }
        }
      )
      .subscribe(async (status) => {
        console.log('KasaOrderDetailScreen subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('KasaOrderDetailScreen realtime subscription başarılı');
          retryCount = 0; // Başarılı olduğunda retry count'u sıfırla
          // Subscription başarılı olduğunda connection aktif olduğunu işaretle
          lastUpdateRef.current = Date.now();
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('KasaOrderDetailScreen subscription hatası');
          setConnectionStatus('disconnected');
          handleSubscriptionError();
        } else if (status === 'TIMED_OUT') {
          console.warn('KasaOrderDetailScreen subscription timeout, yeniden başlatılıyor...');
          setConnectionStatus('disconnected');
          // Timeout olduğunda hemen yeniden dene
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`KasaOrderDetailScreen subscription yeniden deneniyor (${retryCount}/${maxRetries})`);
            setTimeout(() => {
              createSubscription();
            }, 1000); // 1 saniye bekle
          } else {
            console.error('KasaOrderDetailScreen subscription maksimum retry sayısına ulaştı');
            handleSubscriptionError();
          }
        } else if (status === 'CLOSED') {
          console.log('KasaOrderDetailScreen subscription kapandı');
          setConnectionStatus('disconnected');
        }
      });

      return channel;
    };

    const handleSubscriptionError = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`KasaOrderDetailScreen subscription yeniden deneniyor (${retryCount}/${maxRetries})`);
        setTimeout(() => {
          createSubscription();
        }, 2000 * retryCount); // Exponential backoff
      } else {
        console.error('KasaOrderDetailScreen subscription maksimum retry sayısına ulaştı');
      }
    };

    const channel = createSubscription();

    return () => {
      console.log('KasaOrderDetailScreen realtime subscription temizleniyor');
      supabase.removeChannel(channel);
    };
  }, [masaNo, loadOrderDetails]); // Sadece masaNo ve loadOrderDetails dependency olarak kalmalı

  // Siparişin masa_id'sini kontrol et
  const checkOrderMasaId = async (orderId) => {
    try {
      // orderId geçersizse null döndür
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        console.log('checkOrderMasaId: Geçersiz orderId:', orderId);
        return null;
      }

      const { data: order, error } = await supabase
        .from(TABLES.SIPARISLER)
        .select('id, masa_id')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return order;
    } catch (error) {
      console.error('Sipariş masa_id kontrol edilirken hata:', error);
      return null;
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
        return 'Beklemede olan sipariş yok';
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
    const orderCount = getOrderCountByStatus(key);
    const statusInfo = getStatusInfo(key);
    
    // "Teslim Edildi" için özel genişlik
    const isTeslimEdildi = key === 'teslim_edildi';
    
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
            ...(isTeslimEdildi && {
              minWidth: getResponsiveValue(120, 140, 160, 180),
              maxWidth: getResponsiveValue(160, 180, 200, 220),
            }),
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
        {orderCount > 0 && (
          <View style={[
            styles.filterBadge,
            {
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : statusInfo.bgColor,
            }
          ]}>
            <Text style={[
              styles.filterBadgeText,
              {
                color: isActive ? 'white' : statusInfo.color,
              }
            ]}>
              {orderCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleOrderPress = async (order) => {
    // Order'ı direkt kullan (filteredOrders'dan gelen order zaten güncel)
    // Ama siparis_detaylari eksikse localMasaOrders'dan tam order'ı al
    const currentOrder = order.siparis_detaylari && order.siparis_detaylari.length > 0
      ? order
      : (localMasaOrders.find(o => o.id === order.id) || order);
    
    console.log('Modal açılıyor, order durumu:', currentOrder.durum, 'order ID:', currentOrder.id);
    setSelectedOrder({ ...currentOrder }); // Yeni bir obje oluştur (referans sorununu önlemek için)
    setShowOrderModal(true);
    
    // Sipariş detaylarını yükle
    await loadOrderDetails(order.id);
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setIsUpdating(true);
      
      // Önce sipariş bilgilerini al (push_token_id için)
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .select('push_token_id, siparis_no')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Sipariş durumunu güncelle
      const { error } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ durum: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Local state'i hemen güncelle (realtime güncellemesi gelene kadar)
      // Bu sayede UI anında güncellenir ve realtime güncellemesi geldiğinde tekrar güncellenir
      setLocalMasaOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, durum: newStatus } : order
        )
      );
      
      // Eğer modal açıksa ve bu sipariş modal'daki sipariş ise, selectedOrder'ı da güncelle
      if (showOrderModal && selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prevSelected => ({
          ...prevSelected,
          durum: newStatus
        }));
      }
      
      // Modal'ı kapat
      handleCloseModal();
      
      console.log(`Sipariş ${orderId} durumu ${newStatus} olarak güncellendi`);
      
      // Her durum değişikliğinde bildirim gönder (arka planda, await olmadan)
      if (orderData?.push_token_id && newStatus !== 'beklemede') {
        // Bildirim gönderme işlemini arka planda çalıştır (realtime'ı engellemesin)
        (async () => {
          try {
            // push_token_id ile direkt push_token'ı al
            const { data: pushTokenData, error: pushTokenError } = await supabase
              .from('push_tokens')
              .select('push_token')
              .eq('id', orderData.push_token_id)
              .eq('is_active', true)
              .single();

            if (!pushTokenError && pushTokenData?.push_token) {
              // Durum mesajları
              const durumMesajlari = {
                'hazirlaniyor': {
                  title: 'Siparişiniz Hazırlanıyor',
                  body: `Sipariş #${orderData.siparis_no} hazırlanmaya başlandı.`
                },
                'hazir': {
                  title: 'Siparişiniz Hazır!',
                  body: `Sipariş #${orderData.siparis_no} hazır. Masanıza getirilecek.`
                },
                'teslim_edildi': {
                  title: 'Siparişiniz Teslim Edildi',
                  body: `Sipariş #${orderData.siparis_no} teslim edildi. Afiyet olsun!`
                },
                'iptal': {
                  title: 'Sipariş İptal Edildi',
                  body: `Sipariş #${orderData.siparis_no} iptal edildi.`
                }
              };

              const mesaj = durumMesajlari[newStatus];
              
              if (mesaj) {
                // Bildirim gönder (await olmadan, arka planda)
                sendPushNotificationToTokens(
                  [pushTokenData.push_token],
                  mesaj.title,
                  mesaj.body,
                  {
                    type: 'order_status',
                    siparisNo: orderData.siparis_no,
                    durum: newStatus,
                    orderId: orderId
                  }
                ).then((notificationResult) => {
                  if (notificationResult.success) {
                    console.log(`Bildirim başarıyla gönderildi (${newStatus})`);
                  } else {
                    console.error('Bildirim gönderme hatası:', notificationResult.error);
                  }
                }).catch((notificationError) => {
                  console.error('Bildirim gönderme hatası:', notificationError);
                });
              }
            } else {
              console.log('Push token bulunamadı. push_token_id:', orderData.push_token_id);
            }
          } catch (notificationError) {
            console.error('Bildirim gönderme hatası:', notificationError);
            // Bildirim hatası sipariş güncellemesini engellemez
          }
        })();
      }
      
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
          {order.siparis_detaylari && order.siparis_detaylari.length > 0 ? (
            order.siparis_detaylari.map((item, index) => (
              <Text key={index} style={styles.orderCardProduct}>
                {item.adet} {item.urunler?.ad || 'Ürün'}
              </Text>
            ))
          ) : (
            <Text style={styles.orderCardProduct}>
              Yükleniyor...
            </Text>
          )}
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
           {masaNo} - Siparişler
          </Text>
          <View style={[
            styles.connectionIndicator, 
            { backgroundColor: connectionStatus === 'connected' ? '#10B981' : '#EF4444' }
          ]}>
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? '●' : '●'}
            </Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <View style={styles.filterButtons}>
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
        <View style={styles.modalContainer}>
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
                <Text style={styles.modalOrderTable}>{masaNo}</Text>
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
              <View style={styles.modalNotesSection}>
                <Text style={styles.modalSectionTitle}>Notlar</Text>
                <Text style={styles.modalNotesText}>
                  {selectedOrder.aciklama || 'Not yok'}
                </Text>
              </View>

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
                      style={[styles.modalActionButton, styles.modalActionButtonPurple]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'teslim_edildi')}
                      disabled={isUpdating}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Teslim Edildi</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOrder.durum === 'teslim_edildi' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonPurple]}
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
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  headerTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
    textAlign: 'center',
  },
  connectionIndicator: {
    width: getResponsiveValue(8, 10, 12, 14),
    height: getResponsiveValue(8, 10, 12, 14),
    borderRadius: getResponsiveValue(4, 5, 6, 7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: getResponsiveValue(6, 7, 8, 9),
    color: 'white',
    fontWeight: 'bold',
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
    flexDirection: 'row',
    gap: getResponsiveValue(6, 8, 10, 12),
  },
  filterButtonActive: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
    shadowColor: '#6B7280',
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
  filterBadge: {
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    minWidth: getResponsiveValue(24, 26, 28, 30),
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 5, 6, 7),
    height: getResponsiveValue(24, 26, 28, 30),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: getResponsiveValue(6, 8, 10, 12),
  },
  filterBadgeText: {
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '700',
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
  modalActionButtonPurple: {
    backgroundColor: '#8B5CF6',
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