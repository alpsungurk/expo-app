import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

const ORDER_STATUSES = {
  beklemede: { 
    label: 'Beklemede', 
    color: '#F59E0B', 
    icon: 'time-outline',
    description: 'Siparişiniz alındı ve hazırlanmaya başlanacak'
  },
  hazirlaniyor: { 
    label: 'Hazırlanıyor', 
    color: '#3B82F6', 
    icon: 'cafe-outline',
    description: 'Siparişiniz hazırlanıyor, lütfen bekleyin'
  },
  hazir: { 
    label: 'Hazır', 
    color: '#10B981', 
    icon: 'checkmark-circle-outline',
    description: 'Siparişiniz hazır! Masanıza getirilecek'
  },
  teslim_edildi: { 
    label: 'Teslim Edildi', 
    color: '#8B5CF6', 
    icon: 'checkmark-done-outline',
    description: 'Siparişiniz teslim edildi. Afiyet olsun!'
  },
  odeme_yapildi: { 
    label: 'Ödeme Yapıldı', 
    color: '#10B981', 
    icon: 'card',
    description: 'Ödemeniz yapıldı. Teşekkür ederiz!'
  },
  odeme_yapilmadi: { 
    label: 'Ödeme Yapılmadı', 
    color: '#F59E0B', 
    icon: 'card-outline',
    description: 'Ödeme henüz yapılmadı'
  },
  iptal: { 
    label: 'İptal Edildi', 
    color: '#EF4444', 
    icon: 'close-circle-outline',
    description: 'Siparişiniz iptal edildi'
  },
  siparis_yok: { 
    label: 'Sipariş Yok', 
    color: '#6B7280', 
    icon: 'document-outline',
    description: 'Henüz bir siparişiniz bulunmuyor'
  }
};

export default function OrderStatusScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Aktif sipariş sayısını hesapla (beklemede, hazırlanıyor, hazır)
  const getActiveOrdersCount = () => {
    return orders.filter(order => 
      ['beklemede', 'hazirlaniyor', 'hazir'].includes(order.durum)
    ).length;
  };
  const [phoneToken, setPhoneToken] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { currentOrder, setCurrentOrder, activeOrder, setActiveOrder, setAllOrders, user } = useAppStore();

  // Phone token'ı al
  useEffect(() => {
    const getPhoneToken = async () => {
      try {
        const token = await AsyncStorage.getItem('phoneToken');
        setPhoneToken(token);
      } catch (error) {
        console.error('Phone token alma hatası:', error);
      }
    };
    getPhoneToken();
  }, []);

  useEffect(() => {
    if (phoneToken) {
      loadOrdersData();
      
      // Önceki subscription'ı temizle
      const channelName = 'orders-updates';
      const existingChannel = supabase.channel(channelName);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }
      
      let retryCount = 0;
      const maxRetries = 3;
      
      const createSubscription = () => {
        const subscription = supabase
          .channel(channelName)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: TABLES.SIPARISLER
            }, 
            (payload) => {
              console.log('OrderStatusScreen realtime güncelleme:', payload);
              
              // Giriş yapmışsa kullanici_id'ye göre, yoksa phoneToken'a göre kontrol et
              let shouldUpdate = false;
              
              if (payload.new) {
                if (user?.id) {
                  // Giriş yapmışsa kullanici_id kontrolü
                  shouldUpdate = payload.new.kullanici_id === user.id;
                } else {
                  // Giriş yapmamışsa phoneToken kontrolü
                  shouldUpdate = payload.new.telefon_token === phoneToken;
                }
                
                if (shouldUpdate) {
                  console.log('Bu kullanıcıya ait sipariş güncellendi:', payload.new);
                  
                  // İptal durumu özel kontrolü
                  if (payload.new.durum === 'iptal') {
                    console.log('Sipariş iptal edildi:', payload.new);
                  }
                  
                  // Notlar güncelleme kontrolü
                  if (payload.new.aciklama !== undefined) {
                    console.log('Sipariş notları güncellendi:', {
                      orderId: payload.new.id,
                      newNotes: payload.new.aciklama
                    });
                  }
                  
                  loadOrdersData();
                }
              } else if (payload.old) {
                if (user?.id) {
                  // Giriş yapmışsa kullanici_id kontrolü
                  shouldUpdate = payload.old.kullanici_id === user.id;
                } else {
                  // Giriş yapmamışsa phoneToken kontrolü
                  shouldUpdate = payload.old.telefon_token === phoneToken;
                }
                
                if (shouldUpdate) {
                  console.log('Bu kullanıcıya ait sipariş silindi:', payload.old);
                  loadOrdersData();
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('OrderStatusScreen subscription status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('OrderStatusScreen realtime subscription başarılı');
              retryCount = 0;
            } else if (status === 'CHANNEL_ERROR') {
              console.error('OrderStatusScreen subscription hatası');
              handleSubscriptionError();
            } else if (status === 'TIMED_OUT') {
              console.warn('OrderStatusScreen subscription timeout');
              handleSubscriptionError();
            }
          });

        return subscription;
      };

      const handleSubscriptionError = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`OrderStatusScreen subscription yeniden deneniyor (${retryCount}/${maxRetries})`);
          setTimeout(() => {
            createSubscription();
          }, 2000 * retryCount);
        } else {
          console.error('OrderStatusScreen subscription maksimum retry sayısına ulaştı');
        }
      };

      const subscription = createSubscription();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [phoneToken, user]); // user değiştiğinde de subscription'ı yeniden başlat (realtime kontrolü için)

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

  // Sayfa her açıldığında verileri yenile
  useFocusEffect(
    useCallback(() => {
      if (phoneToken) {
        loadOrdersData();
      }
    }, [phoneToken, user]) // user değiştiğinde de yeniden yükle
  );

  const loadOrdersData = async () => {
    try {
      if (!phoneToken) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Sorgu oluştur
      let query = supabase
        .from(TABLES.SIPARISLER)
        .select(`
          *,
          masalar (
            masa_no
          ),
          siparis_detaylari (
            id,
            adet,
            toplam_fiyat,
            urunler (
              ad,
              fiyat
            )
          )
        `);
      
      // Giriş yapmışsa kullanici_id'ye göre, yoksa phoneToken'a göre filtrele
      if (user?.id) {
        console.log('OrderStatusScreen: Giriş yapılmış, kullanici_id ile filtreleme yapılıyor:', user.id);
        query = query.eq('kullanici_id', user.id);
      } else {
        console.log('OrderStatusScreen: Giriş yapılmamış, phoneToken ile filtreleme yapılıyor:', phoneToken);
        query = query.eq('telefon_token', phoneToken);
      }
      
      const { data: ordersData, error: ordersError } = await query
        .order('olusturma_tarihi', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);
      
      // Tüm siparişleri AppStore'a kaydet
      setAllOrders(ordersData || []);

      // Aktif siparişi güncelle (beklemede, hazırlanıyor veya hazır olan ilk sipariş)
      const activeOrderData = ordersData?.find(o => 
        ['beklemede', 'hazirlaniyor', 'hazir'].includes(o.durum)
      );
      
      if (activeOrderData) {
        setActiveOrder(activeOrderData);
      } else {
        setActiveOrder(null);
      }

    } catch (error) {
      console.error('Siparişler yükleme hatası:', error);
      Alert.alert('Hata', 'Siparişler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateEstimatedTime = (orderDetails) => {
    const totalPreparationTime = orderDetails.reduce((total, detail) => {
      return total + (detail.urunler?.hazirlanma_suresi || 5) * detail.adet;
    }, 0);
    
    // Ortalama hazırlık süresi + 5 dakika buffer
    return Math.max(totalPreparationTime + 5, 10);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrdersData();
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
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

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.beklemede;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TableHeader 
          onSidebarPress={() => setSidebarVisible(true)}
          onInfoPress={() => navigation.navigate('InfoScreen')}
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  // Ürün listesini render et (alt alta)
  const renderProductList = (orderDetails) => {
    if (!orderDetails || orderDetails.length === 0) {
      return <Text style={styles.productItemText}>Ürün yok</Text>;
    }
    
    return orderDetails.map((detail, index) => {
      const productName = detail.urunler?.ad || 'Bilinmeyen Ürün';
      return (
        <Text key={index} style={styles.productItemText}>
          {detail.adet}x {productName}
        </Text>
      );
    });
  };

  // Sipariş kartı render fonksiyonu
  const renderOrderCard = (order) => {
    const statusInfo = getStatusInfo(order.durum);
    const itemCount = order.siparis_detaylari?.length || 0;
    const estimatedTime = calculateEstimatedTime(order.siparis_detaylari || []);

    return (
      <TouchableOpacity 
        key={order.id}
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { 
          order, 
          orderDetails: order.siparis_detaylari 
        })}
        activeOpacity={0.7}
      >
        {/* Üst Kısım - Sipariş No ve Durum */}
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardLeft}>
            <Ionicons 
              name={statusInfo.icon} 
              size={24} 
              color={statusInfo.color} 
            />
            <View style={styles.orderCardInfo}>
              <Text style={styles.orderCardNumber}>#{order.siparis_no}</Text>
              <Text style={styles.orderCardMasa}>{order.masalar?.masa_no || order.masa_no || 'N/A'}</Text>
              <Text style={styles.orderCardDate}>{formatDate(order.olusturma_tarihi)}</Text>
            </View>
          </View>
          
          <View style={[
            styles.orderCardBadge,
            { backgroundColor: statusInfo.color }
          ]}>
            <Text style={styles.orderCardBadgeText}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Orta Kısım - Ürün Listesi ve Tutar */}
        <View style={styles.orderCardBody}>
          <View style={styles.productListContainer}>
            <Ionicons name="fast-food-outline" size={16} color="#6B7280" />
            <View style={styles.productList}>
              {renderProductList(order.siparis_detaylari)}
            </View>
          </View>
          
          {['beklemede', 'hazirlaniyor'].includes(order.durum) && (
            <View style={styles.orderCardDetail}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.orderCardDetailText}>~{estimatedTime} dk</Text>
            </View>
          )}
          
          <View style={styles.orderCardDetail}>
            {/* İndirim bilgisini hesapla - sipariş detaylarından */}
            {(() => {
              // Sipariş detaylarındaki toplam fiyatları topla (indirim öncesi)
              const araToplamHesaplanan = order.siparis_detaylari?.reduce((sum, detail) => {
                return sum + (parseFloat(detail.toplam_fiyat) || 0);
              }, 0) || 0;
              
              // İndirim miktarı = ara toplam - indirimli toplam
              const indirimMiktari = araToplamHesaplanan > 0 && araToplamHesaplanan > order.toplam_tutar
                ? araToplamHesaplanan - parseFloat(order.toplam_tutar || 0)
                : 0;
              
              // Ara toplam (indirim öncesi)
              const araToplam = indirimMiktari > 0 
                ? araToplamHesaplanan
                : order.toplam_tutar;
              
              return (
                <View style={styles.orderCardPriceContainer}>
                  {indirimMiktari > 0 && (
                    <View style={styles.orderCardDiscountInfo}>
                      <Text style={styles.orderCardOriginalPrice}>{formatPrice(araToplam)}</Text>
                      <View style={styles.orderCardDiscountBadge}>
                        <Ionicons name="pricetag" size={12} color="#10B981" />
                        <Text style={styles.orderCardDiscountText}>-{formatPrice(indirimMiktari)}</Text>
                      </View>
                    </View>
                  )}
                  <Text style={styles.orderCardPrice}>{formatPrice(order.toplam_tutar)}</Text>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Alt Kısım - Durum Açıklaması */}
        <View style={styles.orderCardFooter}>
          <Text style={[styles.orderCardDescription, { color: statusInfo.color }]}>
            {statusInfo.description}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  // Sipariş yoksa
  if (!isLoading && orders.length === 0) {
    return (
      <View style={styles.container}>
        <TableHeader 
          onSidebarPress={() => setSidebarVisible(true)}
          onInfoPress={() => navigation.navigate('InfoScreen')}
        />

        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={80} color="#6B7280" />
          <Text style={styles.emptyTitle}>Sipariş Yok</Text>
          <Text style={styles.emptyDescription}>
            Henüz bir siparişiniz bulunmuyor. Yeni sipariş vermek için menüye göz atabilirsiniz.
          </Text>
          <TouchableOpacity 
            style={styles.backToMenuButton}
            onPress={() => navigation.navigate('Menü')}
          >
            <Text style={styles.backToMenuButtonText}>Menüye Dön</Text>
          </TouchableOpacity>
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  // Ana sipariş listesi ekranı
  return (
    <View style={styles.container}>
      <TableHeader 
        onSidebarPress={() => setSidebarVisible(true)}
        onInfoPress={() => navigation.navigate('InfoScreen')}
      />

      <Animated.ScrollView 
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Aktif Sipariş Durumu Göstergesi - Kaldırıldı */}

        {/* Siparişlerim Başlığı */}
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>Siparişlerim</Text>
          <Text style={styles.ordersCount}>{orders.length} sipariş</Text>
        </View>

        {/* Sipariş Listesi */}
        <View style={styles.ordersContainer}>
          {orders.map(renderOrderCard)}
        </View>

        {/* Alt Boşluk */}
        <View style={{ height: 20 }} />
      </Animated.ScrollView>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    shadowRadius: 8,
    elevation: 3,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moreItemsText: {
    fontSize: 14,
    color: '#8B4513',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
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
    color: '#1F2937',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
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
    shadowRadius: 8,
    elevation: 3,
  },
  notesText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  secondaryButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backToMenuButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backToMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Sipariş Durumu Göstergesi
  orderStatusContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  orderStatusCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  orderStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  orderStatusTextContainer: {
    flex: 1,
  },
  orderStatusTitle: {
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 4,
  },
  orderStatusSubtitle: {
    fontWeight: '500',
    fontFamily: 'System',
    opacity: 0.8,
  },
  // Sipariş Listesi Stilleri
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ordersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'System',
  },
  ordersCount: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  ordersContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderCardInfo: {
    gap: 4,
  },
  orderCardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'System',
  },
  orderCardMasa: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'System',
  },
  orderCardDate: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderCardBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'System',
  },
  orderCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productListContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  productList: {
    flex: 1,
  },
  productItemText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
    marginBottom: 2,
  },
  orderCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderCardDetailText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderCardPriceContainer: {
    alignItems: 'flex-end',
  },
  orderCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    fontFamily: 'System',
  },
  orderCardDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderCardOriginalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
  },
  orderCardDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  orderCardDiscountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'System',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderCardDescription: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'System',
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
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backToMenuButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backToMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
