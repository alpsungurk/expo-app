import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Dimensions,
  Animated,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { supabase, TABLES } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import CampaignSlider from '../components/CampaignSlider';
import ProductDetailScreen from './ProductDetailScreen';
import ProductCard from '../components/ProductCard';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';


const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;
const isTablet = width >= 1024;

// Sipariş durumları (OrderStatusScreen'den alındı)
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
    color: '#059669', 
    icon: 'checkmark-done-outline',
    description: 'Siparişiniz teslim edildi. Afiyet olsun!'
  },
  iptal: { 
    label: 'İptal Edildi', 
    color: '#EF4444', 
    icon: 'close-circle-outline',
    description: 'Siparişiniz iptal edildi'
  }
};

// Responsive değerler
const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ordersDropdownVisible, setOrdersDropdownVisible] = useState(false);
  const [orders, setOrders] = useState([]);
  const modalSlideAnim = useRef(new Animated.Value(0)).current;

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const categoryScrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const {
    categories,
    products,
    setCategories,
    setProducts,
    setCampaigns,
    setAnnouncements,
    setYeniOneriler,
    setSistemAyarlari,
    isLoading,
    setLoading,
    setProductModalOpen
  } = useAppStore();

  const { tableNumber, tableId, phoneToken, addItem } = useCartStore();
  const { activeOrder, setActiveOrder, setAllOrders } = useAppStore();

  useEffect(() => {
    loadData();
    loadOrdersData();

    // Staggered animation entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Sayfa her açıldığında verileri yenile
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      loadOrdersData();
    }, [phoneToken])
  );

  useEffect(() => {
    let filtered = products.filter(product => product.aktif);
    
    // Kategori filtresi
    if (selectedCategory) {
      filtered = filtered.filter(product => product.kategori_id === selectedCategory.id);
    }
    
    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.ad.toLowerCase().includes(query) ||
        product.aciklama?.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  }, [selectedCategory, products, searchQuery]);

  // Phone token değiştiğinde siparişleri yeniden yükle
  useEffect(() => {
    if (phoneToken) {
      loadOrdersData();
    } else {
      setOrders([]);
      setActiveOrder(null);
    }
  }, [phoneToken]);

  // Modal açılırken animasyon
  useEffect(() => {
    if (selectedProduct) {
      // Modal açılırken aşağıdan yukarıya animasyon
      Animated.timing(modalSlideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Modal kapandığında animasyonu sıfırla
      modalSlideAnim.setValue(0);
    }
  }, [selectedProduct]);


  const handleCategorySelect = (category) => {
    // Haptic feedback for better UX
    const isCurrentlySelected = selectedCategory?.id === category.id;

    if (isCurrentlySelected) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      // Animate category selection
      Animated.spring(categoryScrollX, {
        toValue: category.id * 80, // Approximate width per category
        tension: 150,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Veri yükleniyor...');
      console.log('📊 Supabase URL:', supabase.supabaseUrl);
      
      // Kategorileri yükle
      const { data: categoriesData, error: categoriesError } = await supabase
        .from(TABLES.KATEGORILER)
        .select('*')
        .eq('aktif', true)
        .order('sira_no', { ascending: true });

      if (categoriesError) {
        console.error('❌ Kategoriler hatası:', categoriesError);
        throw categoriesError;
      }
      
      console.log('✅ Kategoriler yüklendi:', categoriesData?.length || 0, 'kayıt');

      // Ürünleri yükle
      const { data: productsData, error: productsError } = await supabase
        .from(TABLES.URUNLER)
        .select('*')
        .eq('aktif', true)
        .order('sira_no', { ascending: true });

      if (productsError) throw productsError;

      // Kampanyaları yükle
      const { data: campaignsData, error: campaignsError } = await supabase
        .from(TABLES.KAMPANYALAR)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (campaignsError) throw campaignsError;

      // Duyuruları yükle
      const { data: announcementsData, error: announcementsError } = await supabase
        .from(TABLES.DUYURULAR)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (announcementsError) throw announcementsError;

      // Yeni önerileri yükle (ürün bilgileri ile birlikte)
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from(TABLES.YENI_ONERILER)
        .select(`
          *,
          urunler:urun_id (
            id,
            ad,
            fiyat,
            resim_path,
            aciklama
          )
        `)
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (suggestionsError) throw suggestionsError;

      // Sistem ayarlarını yükle
      const { data: sistemAyarlariData, error: sistemAyarlariError } = await supabase
        .from(TABLES.SISTEM_AYARLARI)
        .select('*')
        .order('id', { ascending: true });

      if (sistemAyarlariError) throw sistemAyarlariError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);
      setCampaigns(campaignsData || []);
      setAnnouncements(announcementsData || []);
      setYeniOneriler(suggestionsData || []);
      setSistemAyarlari(sistemAyarlariData || []);
      
      // Loading state'lerini güncelle
      setCampaignsLoading(false);
      setProductsLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
      setCategories([]);
      setProducts([]);
      setCampaigns([]);
      setAnnouncements([]);
      setYeniOneriler([]);
      setSistemAyarlari([]);
      
      // Loading state'lerini güncelle
      setCampaignsLoading(false);
      setProductsLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersData = async () => {
    if (!phoneToken) return;

    try {
      console.log('🔄 Siparişler yükleniyor...');
      console.log('📊 Phone Token:', phoneToken);
      
      // Telefon token'a göre siparişleri yükle (OrderStatusScreen ile aynı mantık)
      const { data: ordersData, error: ordersError } = await supabase
        .from(TABLES.SIPARISLER)
        .select(`
          *,
          siparis_detaylari (
            id,
            adet,
            toplam_fiyat,
            urunler (
              ad,
              fiyat
            )
          )
        `)
        .eq('telefon_token', phoneToken)
        .order('olusturma_tarihi', { ascending: false });

      if (ordersError) throw ordersError;

      console.log('✅ Siparişler yüklendi:', ordersData?.length || 0, 'kayıt');
      setOrders(ordersData || []);
      
      // Tüm siparişleri AppStore'a kaydet
      setAllOrders(ordersData || []);

      // Aktif siparişi güncelle
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
      setOrders([]);
    }
  };

  const handleQRScan = () => {
    navigation.navigate('Sipariş Ver');
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setProductModalVisible(true);
    setProductModalOpen(true); // Global state'i güncelle
  };

  const handleCloseModal = () => {
    setProductModalOpen(false); // Global state'i güncelle
    // Modal kapanırken yukarıdan aşağıya animasyon
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setProductModalVisible(false);
      setSelectedProduct(null);
    });
  };


  const handleAddToCart = (product) => {
    if (!tableId) {
      Toast.show({
        type: 'error',
        text1: 'Masa Seçilmedi',
        text2: 'Ürün eklemek için önce masa QR kodunu tarayın.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    addItem(product);
    
    // Önce mevcut toast'ı gizle
    Toast.hide();
    
    // Kısa bir gecikme sonra yeni toast'ı göster
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Başarılı',
        text2: `${product.ad} sepete eklendi!`,
        position: 'top',
        visibilityTime: 2000,
        autoHide: true,
        topOffset: 60,
      });
    }, 100);
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.beklemede;
  };

  const numCols = getResponsiveValue(2, 2, 3, 4);

  const renderProduct = ({ item, index }) => {
    // Tek ürün kaldığında grid'i kaplamasın, normal boyutta kalsın
    return (
      <View style={{ flex: 1, maxWidth: `${100 / numCols}%` }}>
        <ProductCard
          product={item}
          onPress={handleProductPress}
          onAddToCart={handleAddToCart}
          onProductDetail={handleProductPress}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader 
        onQRScan={handleQRScan} 
        onSidebarPress={() => setSidebarVisible(true)}
      />

      {/* Siparişler Dropdown - Sadece sipariş varsa göster */}
      {orders.length > 0 && (
        <View style={styles.ordersDropdownContainer}>
          <View style={styles.ordersDropdownWrapper}>
            <TouchableOpacity 
              style={styles.ordersDropdownButton}
              onPress={() => setOrdersDropdownVisible(!ordersDropdownVisible)}
            >
              <View style={styles.ordersDropdownContent}>
                <Ionicons name="list-outline" size={20} color="#8B4513" />
                <Text style={styles.ordersDropdownText}>
                  Siparişlerim
                </Text>
              </View>
              <Ionicons 
                name={ordersDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#8B4513" 
              />
            </TouchableOpacity>
            
            {/* Sipariş Sayısı Badge - Sadece sipariş varsa göster */}
            {orders.length > 0 && (
              <View style={styles.ordersBadge}>
                <Text style={styles.ordersBadgeText}>{orders.length}</Text>
              </View>
            )}
          </View>

          {ordersDropdownVisible && (
            <View style={styles.ordersDropdownList}>
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.durum);
                return (
                  <TouchableOpacity 
                    key={order.id}
                    style={styles.orderDropdownItem}
                    onPress={() => {
                      setOrdersDropdownVisible(false);
                      navigation.navigate('OrderDetail', { 
                        order, 
                        orderDetails: order.siparis_detaylari 
                      });
                    }}
                  >
                    <View style={styles.orderDropdownLeft}>
                      <Ionicons 
                        name={statusInfo.icon} 
                        size={16} 
                        color={statusInfo.color} 
                      />
                      <View style={styles.orderDropdownInfo}>
                        <Text style={styles.orderDropdownNumber}>#{order.siparis_no}</Text>
                        <Text style={styles.orderDropdownDate}>{formatDate(order.olusturma_tarihi)}</Text>
                      </View>
                    </View>
                    <View style={styles.orderDropdownRight}>
                      <View style={[styles.orderDropdownBadge, { backgroundColor: statusInfo.color }]}>
                        <Text style={styles.orderDropdownBadgeText}>{statusInfo.label}</Text>
                      </View>
                      <Text style={styles.orderDropdownPrice}>{formatPrice(order.toplam_tutar)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        <Animated.View style={[
          styles.campaignContainer,
          {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -20],
                extrapolate: 'clamp',
              })
            }]
          }
        ]}>
          <CampaignSlider loading={campaignsLoading} />
        </Animated.View>

        {/* Kategoriler */}
        {!productsLoading && (
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: scrollY.interpolate({
                  inputRange: [0, 200],
                  outputRange: [0, -10],
                  extrapolate: 'clamp',
                })
              }]
            }
          ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              style={[
                styles.chip,
                !selectedCategory && styles.chipActive,
              ]}
            >
              <View style={styles.chipContent}>
                <Text
                  style={[
                    styles.chipText,
                    !selectedCategory && styles.chipTextActive,
                    styles.chipLabel,
                  ]}
                >
                  Tümü
                </Text>
              </View>
            </TouchableOpacity>

            {categories.map((category) => {
              const active = selectedCategory?.id === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleCategorySelect(category)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <View style={styles.chipContent}>
                    {category.icon ? (
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {category.icon}
                      </Text>
                    ) : null}
                    <Text style={[styles.chipText, active && styles.chipTextActive, styles.chipLabel]}>
                      {category.ad}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </Animated.View>
        )}

        {/* Ürünler */}
        <Animated.View style={[
          styles.section,
          {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [200, 400],
                outputRange: [0, -5],
                extrapolate: 'clamp',
              })
            }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? selectedCategory.ad : 'Tüm Ürünler'}
            </Text>
            <Text style={styles.productCount}>
              {filteredProducts.length} ürün
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#8B4513" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ürün ara..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {productsLoading ? (
            <Animated.View style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}>
              <ActivityIndicator size="large" color="#8B4513" />
            </Animated.View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((item, index) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.productWrapper,
                    { 
                      width: `${100 / numCols}%`,
                      paddingHorizontal: getResponsiveValue(4, 6, 8, 10),
                      paddingBottom: getResponsiveValue(12, 16, 20, 24),
                    }
                  ]}
                >
                  <ProductCard
                    product={item}
                    onPress={handleProductPress}
                    onAddToCart={handleAddToCart}
                    onProductDetail={handleProductPress}
                  />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [
                {
                  translateY: modalSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ProductDetailScreen
            route={{ params: { product: selectedProduct } }}
            navigation={{
              goBack: handleCloseModal
            }}
          />
        </Animated.View>
      )}

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
  campaignContainer: {
    marginBottom: getResponsiveValue(12, 16, 20, 24),
  },
  section: {
    marginBottom: getResponsiveValue(24, 28, 32, 36),
    paddingHorizontal: getResponsiveValue(12, 16, 20, 24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    marginBottom: getResponsiveValue(12, 16, 20, 24),
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(12, 16, 20, 24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Siparişler Dropdown Stilleri
  ordersDropdownContainer: {
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
    marginTop: getResponsiveValue(20, 24, 28, 32), // Üst bar ile mesafe artırıldı
    marginBottom: getResponsiveValue(12, 16, 20, 24),
  },
  ordersDropdownWrapper: {
    position: 'relative',
  },
  ordersDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ordersDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  ordersDropdownText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'System',
  },
  ordersDropdownList: {
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    marginTop: getResponsiveValue(4, 6, 8, 10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: getResponsiveValue(200, 250, 300, 350),
  },
  orderDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
    paddingVertical: getResponsiveValue(12, 14, 16, 18),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
    flex: 1,
  },
  orderDropdownInfo: {
    gap: 2,
  },
  orderDropdownNumber: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  orderDropdownDate: {
    fontSize: getResponsiveValue(11, 12, 13, 14),
    color: '#6B7280',
    fontFamily: 'System',
  },
  orderDropdownRight: {
    alignItems: 'flex-end',
    gap: getResponsiveValue(4, 6, 8, 10),
  },
  orderDropdownBadge: {
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 5, 6, 8),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  orderDropdownBadgeText: {
    fontSize: getResponsiveValue(10, 11, 12, 13),
    fontWeight: '600',
    color: 'white',
    fontFamily: 'System',
  },
  orderDropdownPrice: {
    fontSize: getResponsiveValue(12, 13, 14, 15),
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'System',
  },
  // Sipariş Sayısı Badge Stilleri
  ordersBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: getResponsiveValue(10, 12, 14, 16),
    minWidth: getResponsiveValue(20, 22, 24, 26),
    height: getResponsiveValue(20, 22, 24, 26),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ordersBadgeText: {
    color: 'white',
    fontSize: getResponsiveValue(10, 11, 12, 13),
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  productCount: {
    fontSize: getResponsiveValue(12, 14, 16, 18),
    color: '#8B4513',
    fontWeight: '600',
    fontFamily: 'System',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    paddingVertical: getResponsiveValue(4, 6, 8, 10),
    borderRadius: 20,
  },
  categoriesRow: {
    paddingVertical: getResponsiveValue(8, 12, 16, 20),
    paddingHorizontal: getResponsiveValue(6, 10, 14, 18),
    gap: getResponsiveValue(8, 12, 16, 20),
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingVertical: getResponsiveValue(8, 12, 16, 20),
    gap: getResponsiveValue(8, 12, 16, 20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    paddingHorizontal: getResponsiveValue(14, 16, 18, 20),
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    borderRadius: 999,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  chipText: {
    color: '#6B7280',
    fontSize: getResponsiveValue(13, 14, 16, 18),
    fontWeight: '600',
  },
  chipLabel: {
    marginLeft: 2,
  },
  chipTextActive: {
    color: 'white',
  },
  productsContainer: {
    paddingBottom: getResponsiveValue(20, 30, 40, 50),
    gap: getResponsiveValue(12, 16, 20, 24),
  },
  loadingContainer: {
    padding: getResponsiveValue(40, 60, 80, 100),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    marginHorizontal: getResponsiveValue(8, 12, 16, 20),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 16, 18, 20),
    color: '#6B7280',
    marginTop: getResponsiveValue(12, 16, 20, 24),
    fontWeight: '500',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  // Grid Stilleri
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
  },
  productWrapper: {
    // width will be set dynamically based on numCols
  },
  // Search Bar Stilleri
  searchContainer: {
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    marginBottom: getResponsiveValue(16, 20, 24, 28),
    marginTop: getResponsiveValue(8, 10, 12, 14),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(12, 14, 16, 18),
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(10, 12, 14, 16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: getResponsiveValue(8, 10, 12, 14),
  },
  searchInput: {
    flex: 1,
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#1F2937',
    fontFamily: 'System',
    padding: 0,
  },
  clearButton: {
    padding: getResponsiveValue(4, 5, 6, 8),
    marginLeft: getResponsiveValue(8, 10, 12, 14),
  },
});