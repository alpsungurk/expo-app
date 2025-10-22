import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, TABLES } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function ProductDetailScreen({ route, navigation }) {
  // Modal olarak kullanıldığında route ve navigation props olarak gelir
  const routeParams = route?.params || {};
  const { product: initialProduct } = routeParams;
  
  const [product, setProduct] = useState(initialProduct);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const { tableNumber, addItem } = useCartStore();
  const insets = useSafeAreaInsets();

  // Resim URL'sini Supabase Storage'dan al
  const getImageUri = () => {
    const STORAGE_BUCKET = 'images';
    const resimPath = product.resim_path;
    
    if (!resimPath) return null;
    
    // Eğer zaten tam URL ise direkt kullan
    if (typeof resimPath === 'string' && /^https?:\/\//i.test(resimPath)) {
      return resimPath;
    }
    
    // Supabase Storage'dan public URL oluştur
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(resimPath);
    return data?.publicUrl || null;
  };

  const imageUri = getImageUri();


  const calculateTotalPrice = () => {
    return product.fiyat * quantity;
  };

  const handleAddToCart = () => {
    if (!tableNumber) {
      Alert.alert(
        'Masa Seçilmedi',
        'Ürün eklemek için önce masa QR kodunu tarayın.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    // Ürünü sepete ekle
    addItem({
      ...product,
      quantity,
      notes
    });

    Alert.alert(
      'Başarılı', 
      `${product.ad} sepete eklendi!`,
      [
        {
          text: 'Sepete Git',
          onPress: () => navigation.navigate('Cart')
        },
        {
          text: 'Devam Et',
          style: 'cancel'
        }
      ]
    );
  };

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
        contentContainerStyle={styles.scrollContent}
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


          {/* Notlar */}
          <View style={styles.notesContainer}>
            <Text style={styles.sectionTitle}>Özel Notlar</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ürününüz için özel notlarınızı yazın..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>

      {/* Alt Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
          <Text style={styles.totalPrice}>{formatPrice(calculateTotalPrice())}</Text>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="white" />
          <Text style={styles.addToCartText}>Sepete Ekle</Text>
        </TouchableOpacity>
      </View>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
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
    paddingTop: isLargeScreen ? 60 : isMediumScreen ? 50 : 40,
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
    paddingBottom: isLargeScreen ? 140 : isMediumScreen ? 120 : 100, // Bottom bar için boşluk
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
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    padding: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
    minHeight: isLargeScreen ? 120 : isMediumScreen ? 100 : 80,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    paddingTop: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    paddingHorizontal: isLargeScreen ? 6 : isMediumScreen ? 4 : 2,
    minWidth: isLargeScreen ? 120 : isMediumScreen ? 100 : 80,
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
    marginHorizontal: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    minWidth: isLargeScreen ? 100 : isMediumScreen ? 80 : 60,
  },
  totalPrice: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 12,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    paddingVertical: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: isLargeScreen ? 100 : isMediumScreen ? 85 : 70,
  },
  addToCartText: {
    color: 'white',
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    fontWeight: 'bold',
    marginLeft: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
  },
});
