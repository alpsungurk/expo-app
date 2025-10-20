import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { product: initialProduct } = route.params;
  
  const [product, setProduct] = useState(initialProduct);
  const [customizations, setCustomizations] = useState({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customizationOptions, setCustomizationOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const { tableNumber, addItem } = useCartStore();

  useEffect(() => {
    loadCustomizationOptions();
  }, []);

  const loadCustomizationOptions = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.URUN_OZELLESTIRME)
        .select(`
          *,
          ozellestirme_degerleri (*)
        `)
        .eq('urun_id', product.id)
        .eq('aktif', true)
        .order('sira_no');

      if (error) throw error;
      setCustomizationOptions(data || []);
    } catch (error) {
      console.error('Özelleştirme seçenekleri yükleme hatası:', error);
    }
  };

  const handleCustomizationChange = (customizationId, valueId, value) => {
    setCustomizations(prev => ({
      ...prev,
      [customizationId]: {
        id: valueId,
        name: value.deger_adi,
        price: value.ek_fiyat || 0
      }
    }));
  };

  const calculateTotalPrice = () => {
    let total = product.fiyat;
    Object.values(customizations).forEach(customization => {
      total += customization.price;
    });
    return total * quantity;
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

    // Miktar kadar ürün ekle
    for (let i = 0; i < quantity; i++) {
      addItem(product, customizations, notes);
    }

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

  const renderCustomizationOption = (option) => {
    const selectedValue = customizations[option.id];
    
    return (
      <View key={option.id} style={styles.customizationSection}>
        <Text style={styles.customizationTitle}>
          {option.secenek_adi}
          {option.zorunlu && <Text style={styles.required}> *</Text>}
        </Text>
        
        {option.ozellestirme_degerleri?.map((value) => (
          <TouchableOpacity
            key={value.id}
            style={[
              styles.customizationOption,
              selectedValue?.id === value.id && styles.selectedOption
            ]}
            onPress={() => handleCustomizationChange(option.id, value.id, value)}
          >
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionText,
                selectedValue?.id === value.id && styles.selectedOptionText
              ]}>
                {value.deger_adi}
              </Text>
              {value.ek_fiyat > 0 && (
                <Text style={[
                  styles.optionPrice,
                  selectedValue?.id === value.id && styles.selectedOptionPrice
                ]}>
                  +{formatPrice(value.ek_fiyat)}
                </Text>
              )}
            </View>
            <View style={[
              styles.radioButton,
              selectedValue?.id === value.id && styles.selectedRadioButton
            ]}>
              {selectedValue?.id === value.id && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
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
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ürün Görseli */}
        <View style={styles.imageContainer}>
          {product.resim_path ? (
            <Image source={{ uri: product.resim_path }} style={styles.image} />
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

          {/* Özelleştirme Seçenekleri */}
          {customizationOptions.length > 0 && (
            <View style={styles.customizationsContainer}>
              <Text style={styles.sectionTitle}>Özelleştirme Seçenekleri</Text>
              {customizationOptions.map(renderCustomizationOption)}
            </View>
          )}

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
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Ionicons name="remove" size={20} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Ionicons name="add" size={20} color="#8B4513" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>{formatPrice(calculateTotalPrice())}</Text>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={20} color="white" />
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#8B4513',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  priceContainer: {
    flex: 1,
    alignItems: 'center',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
