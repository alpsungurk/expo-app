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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import CampaignSlider from '../components/CampaignSlider';
import ProductCard from '../components/ProductCard';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

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
    isLoading,
    setLoading
  } = useAppStore();

  const { tableNumber, addItem } = useCartStore();

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

      // Yeni önerileri yükle
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from(TABLES.YENI_ONERILER)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (suggestionsError) throw suggestionsError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);
      setCampaigns(campaignsData || []);
      setAnnouncements(announcementsData || []);
      setYeniOneriler(suggestionsData || []);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
      setCategories([]);
      setProducts([]);
      setCampaigns([]);
      setAnnouncements([]);
      setYeniOneriler([]);
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

  const numCols = isLargeScreen ? 3 : 2;

  const renderProduct = ({ item, index }) => {
    const isLastSingle = (filteredProducts.length % numCols !== 0) && (index === filteredProducts.length - 1);
    return (
      <View style={isLastSingle ? { flexBasis: '100%' } : { flex: 1 }}>
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

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
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
          <Text style={styles.sectionTitle}>Kategoriler</Text>
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
              <Ionicons name="cafe" size={isSmallScreen ? 40 : 50} color="#8B4513" />
              <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.productsContainer}
              showsVerticalScrollIndicator={false}
              numColumns={numCols}
              columnWrapperStyle={{
                gap: isSmallScreen ? 10 : 12,
                paddingHorizontal: isSmallScreen ? 8 : 12,
              }}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <View style={[
            styles.sidebar,
            {
              width: isLargeScreen ? width * 0.7 : isMediumScreen ? width * 0.8 : width * 0.9
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  width: isLargeScreen ? 45 : isMediumScreen ? 42 : 40,
                  height: isLargeScreen ? 45 : isMediumScreen ? 42 : 40,
                  borderRadius: isLargeScreen ? 22 : isMediumScreen ? 21 : 20,
                }
              ]}
              onPress={() => setSidebarVisible(false)}
            >
              <Ionicons name="close" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            </TouchableOpacity>

            <Text style={[
              styles.sidebarTitle,
              { fontSize: isLargeScreen ? 30 : isMediumScreen ? 26 : 24 }
            ]}>Menü</Text>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
                marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
                borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              }
            ]}>
              <Ionicons name="home" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                  marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                }
              ]}>Ana Sayfa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
                marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
                borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              }
            ]}>
              <Ionicons name="gift" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                  marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                }
              ]}>Kampanyalar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
                marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
                borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              }
            ]}>
              <Ionicons name="megaphone" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                  marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                }
              ]}>Duyurular</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
                marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
                borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              }
            ]}>
              <Ionicons name="settings" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                  marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
                }
              ]}>Ayarlar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  campaignContainer: {
    marginBottom: isSmallScreen ? 12 : 16,
  },
  section: {
    marginBottom: isSmallScreen ? 16 : 20,
    paddingHorizontal: isSmallScreen ? 12 : 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : isLargeScreen ? 22 : 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  productCount: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#8B4513',
    fontWeight: '600',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 20,
  },
  categoriesRow: {
    paddingVertical: isSmallScreen ? 8 : 12,
    paddingHorizontal: isSmallScreen ? 6 : 10,
    gap: isSmallScreen ? 8 : 12,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingVertical: isSmallScreen ? 8 : 12,
    gap: isSmallScreen ? 8 : 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    paddingHorizontal: isSmallScreen ? 14 : 16,
    paddingVertical: isSmallScreen ? 8 : 10,
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
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
  },
  chipLabel: {
    marginLeft: 2,
  },
  chipTextActive: {
    color: 'white',
  },
  productsContainer: {
    paddingBottom: isSmallScreen ? 20 : 30,
    gap: isSmallScreen ? 12 : 16,
  },
  loadingContainer: {
    padding: isSmallScreen ? 40 : 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: isSmallScreen ? 8 : 12,
  },
  loadingText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  // Sidebar styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: isLargeScreen ? width * 0.6 : isMediumScreen ? width * 0.7 : width * 0.8,
    height: '100%',
    backgroundColor: 'white',
    padding: isLargeScreen ? 35 : isMediumScreen ? 30 : 25,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: isLargeScreen ? 50 : isMediumScreen ? 45 : 40,
    height: isLargeScreen ? 50 : isMediumScreen ? 45 : 40,
    borderRadius: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 30 : isMediumScreen ? 25 : 22,
  },
  sidebarTitle: {
    fontSize: isLargeScreen ? 30 : isMediumScreen ? 26 : 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 40 : isMediumScreen ? 35 : 30,
    textAlign: 'center',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
    paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
    marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
  },
  sidebarItemText: {
    fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
  },
});