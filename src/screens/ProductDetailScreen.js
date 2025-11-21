import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase, TABLES } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import { navigationRef } from '../navigation/AppNavigator';
import { useAppStore } from '../store/appStore';
import { getImageUrl } from '../utils/storage';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function ProductDetailScreen({ route, navigation: navigationProp }) {
  // Modal olarak kullanıldığında route ve navigation props olarak gelir
  // Ama navigation hook'unu da kullanabiliriz
  const navigationHook = useNavigation();
  const navigation = navigationProp || navigationHook;
  
  const routeParams = route?.params || {};
  const { product: initialProduct } = routeParams;
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [showDiscountDetails, setShowDiscountDetails] = useState(false);
  
  const { 
    tableNumber, 
    addItem, 
    items, 
    getTotalPrice, 
    getDiscountedPrice, 
    getDiscountAmount, 
    selectedGeneralDiscount,
    loadAvailableDiscounts 
  } = useCartStore();
  
  const { user } = useAppStore();

  // Resim URL'sini Supabase Storage'dan al
  const imageUri = getImageUrl(product?.resim_path);

  useEffect(() => {
    fetchIngredients();
  }, [product?.id]);

  // Sepet toplamı değiştiğinde indirimleri yükle
  useEffect(() => {
    if (items.length > 0) {
      const totalPrice = getTotalPrice();
      loadAvailableDiscounts(user?.id || null, totalPrice);
    }
  }, [items, user?.id, getTotalPrice, loadAvailableDiscounts]);


  const calculateTotalPrice = () => {
    if (!product?.fiyat) return 0;
    const basePrice = product.fiyat * quantity;
    
    // Ürün için indirim varsa uygula
    if (product?.discount) {
      const discountAmount = product.discount.discountAmount * quantity;
      return Math.max(0, basePrice - discountAmount);
    }
    
    return basePrice;
  };

  const getOriginalTotalPrice = () => {
    if (!product?.fiyat) return 0;
    return product.fiyat * quantity;
  };

  const getProductDiscountAmount = () => {
    if (!product?.discount) return 0;
    return product.discount.discountAmount * quantity;
  };

  // Malzemeleri çek
  const fetchIngredients = async () => {
    if (!product?.id) return;
    
    try {
      setIngredientsLoading(true);
      const { data, error } = await supabase
        .from('urun_malzemeleri')
        .select('*')
        .eq('urun_id', product.id)
        .order('sira_no', { ascending: true });

      if (error) {
        console.error('Malzemeler çekilirken hata:', error);
        return;
      }

      setIngredients(data || []);
    } catch (error) {
      console.error('Malzemeler çekilirken hata:', error);
    } finally {
      setIngredientsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!tableNumber) {
      // Önce QRScanScreen'e navigate et - navigationRef kullan
      if (navigationRef.current) {
        navigationRef.current.dispatch(
          CommonActions.navigate({
            name: 'Sipariş Ver',
          })
        );
      }
      
      // Sonra toast mesajını göster
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

    // Ürünü sepete ekle
    addItem({
      ...product,
      quantity
    });

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

    // HomeScreen'e yönlendir
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  // Malzeme render fonksiyonu
  const renderIngredient = (ingredient, index) => {
    return (
      <View key={ingredient.id} style={styles.ingredientItem}>
        <View style={styles.ingredientIcon}>
          <Ionicons name="leaf" size={16} color="#8B4513" />
        </View>
        <Text style={styles.ingredientText}>{ingredient.malzeme_adi}</Text>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      <View style={[styles.header, { paddingTop: insets.top + (isLargeScreen ? 20 : isMediumScreen ? 16 : 12) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ürün Detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (isLargeScreen ? 160 : isMediumScreen ? 140 : 120) + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Ürün Görseli */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cafe" size={80} color="#8B4513" />
            </View>
          )}
          
          {product.populer && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popüler</Text>
            </View>
          )}
          
          {product.yeni_urun && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>Yeni</Text>
            </View>
          )}
        </View>

        {/* Ürün Bilgileri */}
        <View style={styles.content}>
          <Text style={styles.title}>{product.ad}</Text>
          
          {product.aciklama && (
            <Text style={styles.description}>{product.aciklama}</Text>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {product.hazirlanma_suresi || 5} dakika
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="star" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {product.populer ? 'Popüler' : 'Standart'}
              </Text>
            </View>
          </View>

          {/* Malzemeler */}
          {ingredients.length > 0 && (
            <View style={styles.ingredientsContainer}>
              <Text style={styles.ingredientsTitle}>Malzemeler</Text>
              <View style={styles.ingredientsGrid}>
                {ingredients.map(renderIngredient)}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Alt Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (isLargeScreen ? 20 : isMediumScreen ? 16 : 12) }]}>
        {/* Adet ve Fiyat - Üstte */}
        <View style={styles.bottomRow}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="#8B4513" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="#8B4513" />
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            {product?.fiyat && (
              <View style={styles.priceInfoContainer}>
                {/* Ürün indirimi varsa göster */}
                {product?.discount ? (
                  <View style={styles.priceInfoColumn}>
                    <View style={styles.priceInfoRow}>
                      <Text style={styles.originalPrice} numberOfLines={1} ellipsizeMode="tail">
                        {formatPrice(getOriginalTotalPrice())}
                      </Text>
                      <Text style={styles.totalPrice} numberOfLines={1} ellipsizeMode="tail">
                        {formatPrice(calculateTotalPrice())}
                      </Text>
                      <View style={styles.discountBadge}>
                        <Ionicons name="pricetag" size={12} color="#10B981" />
                        <Text style={styles.discountBadgeText}>
                          {product.discount.discountType === 'yuzde' 
                            ? `%${product.discount.discountValue}` 
                            : `${formatPrice(product.discount.discountAmount)}`
                          }
                        </Text>
                      </View>
                    </View>
                    {/* İndirim Detayları Dropdown - Fiyatların altında */}
                    <TouchableOpacity
                      style={styles.discountDetailsToggle}
                      onPress={() => setShowDiscountDetails(!showDiscountDetails)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.discountDetailsToggleText}>
                        İndirim Detayları
                      </Text>
                      <Ionicons 
                        name={showDiscountDetails ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#059669" 
                      />
                    </TouchableOpacity>
                    {showDiscountDetails && (
                      <Animated.View style={styles.discountDetailsContainer}>
                        <View style={styles.discountDetailsContent}>
                          <View style={styles.discountDetailsHeader}>
                            <Ionicons name="pricetag" size={16} color="#10B981" />
                            <Text style={styles.discountDetailsTitle}>
                              {product.discount.campaignName || 'İndirim'}
                            </Text>
                          </View>
                          <View style={styles.discountDetailsRow}>
                            <Text style={styles.discountDetailsLabel}>Normal Fiyat:</Text>
                            <Text style={styles.discountDetailsOriginalPrice}>
                              {formatPrice(getOriginalTotalPrice())}
                            </Text>
                          </View>
                          <View style={styles.discountDetailsRow}>
                            <Text style={styles.discountDetailsLabel}>İndirim:</Text>
                            <Text style={styles.discountDetailsDiscountAmount}>
                              -{formatPrice(getProductDiscountAmount())}
                            </Text>
                          </View>
                          <View style={[styles.discountDetailsRow, styles.discountDetailsTotalRow]}>
                            <Text style={styles.discountDetailsLabel}>İndirimli Fiyat:</Text>
                            <Text style={styles.discountDetailsDiscountedPrice}>
                              {formatPrice(calculateTotalPrice())}
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.totalPrice} numberOfLines={1} ellipsizeMode="tail">
                    {formatPrice(calculateTotalPrice())}
                  </Text>
                )}
                {/* Sepet toplamına göre indirim bilgisi */}
                {items.length > 0 && selectedGeneralDiscount && (
                  <View style={[styles.discountBadge, styles.cartDiscountBadge]}>
                    <Ionicons name="pricetag" size={12} color="#10B981" />
                    <Text style={styles.discountBadgeText}>
                      Sepette {formatPrice(getDiscountAmount())} indirim
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Sepete Ekle Butonu - Altta */}
        <View style={styles.addToCartContainer}>
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
            <Ionicons name="cart" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="white" />
            <Text style={styles.addToCartText} numberOfLines={1}>
              Sepete Ekle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    paddingHorizontal: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    backgroundColor: '#8B4513',
  },
  sidebarButton: {
    width: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    height: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    borderRadius: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
    height: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
    borderRadius: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: isLargeScreen ? 160 : isMediumScreen ? 140 : 120, // Bottom bar için boşluk
  },
  imageContainer: {
    position: 'relative',
    height: isLargeScreen ? 300 : isMediumScreen ? 280 : 250,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
  },
  title: {
    fontSize: isLargeScreen ? 28 : isMediumScreen ? 24 : 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 8 : 6,
  },
  description: {
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    color: '#6B7280',
    lineHeight: isLargeScreen ? 28 : isMediumScreen ? 24 : 20,
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  customizationsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  customizationSection: {
    marginBottom: 20,
  },
  customizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  required: {
    color: '#EF4444',
  },
  customizationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    borderColor: '#8B4513',
    backgroundColor: '#FEF3C7',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  selectedOptionText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  optionPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedOptionPrice: {
    color: '#8B4513',
    fontWeight: '600',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#8B4513',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B4513',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: isLargeScreen ? 24 : isMediumScreen ? 20 : 12,
    paddingTop: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000, // Tab bar'ın üstünde olması için
  },
  addToCartContainer: {
    alignItems: 'center',
    marginTop: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    width: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    paddingHorizontal: isLargeScreen ? 6 : isMediumScreen ? 4 : 2,
    minWidth: isLargeScreen ? 120 : isMediumScreen ? 100 : 70,
    flexShrink: 0,
    marginRight: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
  },
  quantityButton: {
    width: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
    height: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
    borderRadius: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityText: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    minWidth: isLargeScreen ? 35 : isMediumScreen ? 30 : 25,
    textAlign: 'center',
  },
  priceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0, // Text overflow için önemli
    flexShrink: 1,
    marginRight: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
  },
  priceInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  priceInfoColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  priceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: isLargeScreen ? 6 : isMediumScreen ? 5 : 4,
    justifyContent: 'center',
  },
  totalPrice: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  originalPrice: {
    fontWeight: 'normal',
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 12 : 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cartDiscountBadge: {
    marginTop: 4,
  },
  discountBadgeText: {
    fontSize: isLargeScreen ? 12 : isMediumScreen ? 11 : 10,
    fontWeight: '600',
    color: '#059669',
  },
  discountDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
    paddingVertical: isLargeScreen ? 6 : isMediumScreen ? 5 : 4,
  },
  discountDetailsToggleText: {
    fontSize: isLargeScreen ? 13 : isMediumScreen ? 12 : 11,
    color: '#059669',
    fontWeight: '600',
  },
  discountDetailsContainer: {
    width: '100%',
    marginTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  discountDetailsContent: {
    backgroundColor: '#F0FDF4',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    padding: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discountDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    paddingBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  discountDetailsTitle: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 15 : 14,
    fontWeight: '700',
    color: '#059669',
  },
  discountDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  discountDetailsTotalRow: {
    marginTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
    paddingTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  discountDetailsLabel: {
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  discountDetailsOriginalPrice: {
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  discountDetailsDiscountAmount: {
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12,
    color: '#10B981',
    fontWeight: '600',
  },
  discountDetailsDiscountedPrice: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 15 : 14,
    color: '#059669',
    fontWeight: '700',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: isLargeScreen ? 32 : isMediumScreen ? 28 : 24,
    paddingVertical: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    minHeight: isLargeScreen ? 56 : isMediumScreen ? 52 : 48,
  },
  addToCartText: {
    color: 'white',
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    fontWeight: 'bold',
    marginLeft: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
  },
  // Malzemeler Styles
  ingredientsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  ingredientIcon: {
    marginRight: 8,
  },
  ingredientText: {
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12,
    color: '#374151',
    fontWeight: '500',
  },
});
