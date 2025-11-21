import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useCartStore } from '../store/cartStore';
import ProductCard from '../components/ProductCard';
import TableHeader from '../components/TableHeader';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;
const isTablet = width >= 1024;

const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

export default function CategoryProductsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { category, products, categoryName } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSortFilter, setSelectedSortFilter] = useState([]); // ['populer', 'yeni'] - her ikisi de seçilebilir
  const [filteredProducts, setFilteredProducts] = useState(products || []);
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const { tableId, addItem } = useCartStore();

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

  useEffect(() => {
    let filtered = products || [];
    
    // Popüler/Yeni filtresi - her iki filtre de seçilebilir
    if (selectedSortFilter.length > 0) {
      filtered = filtered.filter(product => {
        // Eğer popüler seçiliyse, ürün popüler olmalı
        if (selectedSortFilter.includes('populer') && !product.populer) {
          return false;
        }
        // Eğer yeni seçiliyse, ürün yeni olmalı
        if (selectedSortFilter.includes('yeni') && !product.yeni_urun) {
          return false;
        }
        // Her iki koşul da sağlanıyorsa veya sadece bir filtre seçiliyse ve o koşul sağlanıyorsa, ürünü göster
        return true;
      });
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.ad?.toLowerCase().includes(query) ||
        product.aciklama?.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedSortFilter, products]);

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleAddToCart = (product) => {
    if (!tableId) {
      navigation.navigate('Sipariş Ver');
      setTimeout(() => {
        Toast.show({
          type: 'error',
          text1: 'Masa Seçilmedi',
          text2: 'Ürün eklemek için önce masa QR kodunu tarayın.',
          position: 'top',
          visibilityTime: 3000,
        });
      }, 500);
      return;
    }

    addItem(product);
    
    Toast.hide();
    
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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const numCols = getResponsiveValue(2, 2, 3, 4);

  return (
    <View style={styles.container}>
      <TableHeader 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onQRScan={() => navigation.navigate('Sipariş Ver')}
        onInfoPress={() => navigation.navigate('InfoScreen')}
        hideNotifications={true}
      />

      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{categoryName || 'Tüm Ürünler'}</Text>
            </View>
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

          {/* Filter Chips */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              onPress={() => {
                if (selectedSortFilter.includes('populer')) {
                  // Eğer zaten seçiliyse, kaldır
                  setSelectedSortFilter(selectedSortFilter.filter(f => f !== 'populer'));
                } else {
                  // Eğer seçili değilse, ekle
                  setSelectedSortFilter([...selectedSortFilter, 'populer']);
                }
              }}
              style={[
                styles.chip,
                selectedSortFilter.includes('populer') && styles.chipActive,
              ]}
            >
              <View style={styles.chipContent}>
                <Ionicons 
                  name="flame-outline" 
                  size={getResponsiveValue(16, 18, 20, 22)} 
                  color={selectedSortFilter.includes('populer') ? 'white' : '#6B7280'} 
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedSortFilter.includes('populer') && styles.chipTextActive,
                  ]}
                >
                  Popüler
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedSortFilter.includes('yeni')) {
                  // Eğer zaten seçiliyse, kaldır
                  setSelectedSortFilter(selectedSortFilter.filter(f => f !== 'yeni'));
                } else {
                  // Eğer seçili değilse, ekle
                  setSelectedSortFilter([...selectedSortFilter, 'yeni']);
                }
              }}
              style={[
                styles.chip,
                selectedSortFilter.includes('yeni') && styles.chipActive,
              ]}
            >
              <View style={styles.chipContent}>
                <Ionicons 
                  name="sparkles-outline" 
                  size={getResponsiveValue(16, 18, 20, 22)} 
                  color={selectedSortFilter.includes('yeni') ? 'white' : '#6B7280'} 
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedSortFilter.includes('yeni') && styles.chipTextActive,
                  ]}
                >
                  Yeni
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Ürün bulunamadı</Text>
              <Text style={styles.emptyText}>
                Arama kriterlerinize uygun ürün bulunamadı
              </Text>
            </View>
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
                    discount={item.discount}
                    onPress={handleProductPress}
                    onAddToCart={handleAddToCart}
                    onProductDetail={handleProductPress}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
    flex: 1,
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
  searchContainer: {
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    marginBottom: getResponsiveValue(12, 14, 16, 18),
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(8, 10, 12, 14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(6, 8, 10, 12),
  },
  chipText: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'System',
  },
  chipTextActive: {
    color: 'white',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: getResponsiveValue(8, 12, 16, 20),
  },
  productWrapper: {
    // width will be set dynamically based on numCols
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(60, 80, 100, 120),
    paddingHorizontal: getResponsiveValue(40, 50, 60, 70),
  },
  emptyTitle: {
    fontSize: getResponsiveValue(20, 22, 24, 26),
    fontWeight: '600',
    color: '#374151',
    marginTop: getResponsiveValue(16, 20, 24, 28),
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: getResponsiveValue(14, 16, 18, 20),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
    fontFamily: 'System',
  },
});

