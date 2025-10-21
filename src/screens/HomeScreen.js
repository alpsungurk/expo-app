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
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import CampaignSlider from '../components/CampaignSlider';
import ProductCard from '../components/ProductCard';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';


const { width, height } = Dimensions.get('window');
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

export default function HomeScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const categoryScrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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
    setLoading
  } = useAppStore();

  const { tableNumber, addItem } = useCartStore();
  const { activeOrder, setActiveOrder } = useAppStore();

  useEffect(() => {
    loadData();

    // Staggered animation entrance
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

  useEffect(() => {
    if (selectedCategory) {
      const filtered = products.filter(product =>
        product.kategori_id === selectedCategory.id && product.aktif
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products.filter(product => product.aktif));
    }
  }, [selectedCategory, products]);

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
        useNativeDriver: false,
      }).start();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Kategorileri yükle
      const { data: categoriesData, error: categoriesError } = await supabase
        .from(TABLES.KATEGORILER)
        .select('*')
        .eq('aktif', true)
        .order('sira_no', { ascending: true });

      if (categoriesError) throw categoriesError;

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
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
      setCategories([]);
      setProducts([]);
      setCampaigns([]);
      setAnnouncements([]);
      setYeniOneriler([]);
      setSistemAyarlari([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    navigation.navigate('Sipariş Ver');
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleAddToCart = (product) => {
    if (!tableNumber) {
      Alert.alert(
        'Masa Seçilmedi',
        'Ürün eklemek için önce masa QR kodunu tarayın.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    addItem(product);
    Alert.alert('Başarılı', `${product.ad} sepete eklendi!`);
  };

  // Test fonksiyonları
  const setTestOrder = (status) => {
    if (status === null) {
      setActiveOrder(null);
    } else {
      setActiveOrder({
        id: 1,
        siparis_no: 'TEST-001',
        durum: status,
        olusturma_tarihi: new Date().toISOString(),
        qr_token: 'test-table'
      });
    }
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
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onQRScan={handleQRScan} onSidebarPress={() => setSidebarVisible(true)} />

      {/* Test Butonları - Geliştirme için */}
      <View style={styles.testButtonsContainer}>
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#FEF3C7' }]}
          onPress={() => setTestOrder('hazirlaniyor')}
        >
          <Text style={[styles.testButtonText, { color: '#8B4513' }]}>Hazırlanıyor</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#DCFCE7' }]}
          onPress={() => setTestOrder('hazir')}
        >
          <Text style={[styles.testButtonText, { color: '#166534' }]}>Hazırlandı</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#F3F4F6' }]}
          onPress={() => setTestOrder(null)}
        >
          <Text style={[styles.testButtonText, { color: '#6B7280' }]}>Sipariş Yok</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
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
          <CampaignSlider />
        </Animated.View>

        {/* Kategoriler */}
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

          {isLoading ? (
            <Animated.View style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}>
              <Ionicons name="cafe" size={getResponsiveValue(40, 45, 50, 55)} color="#8B4513" />
              <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
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
                  />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  // Test Butonları Stilleri
  testButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  testButton: {
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  testButtonText: {
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
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
  // Grid Stilleri
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
  },
  productWrapper: {
    // width will be set dynamically based on numCols
  },
});