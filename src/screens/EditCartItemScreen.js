import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useCartStore } from '../store/cartStore';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function EditCartItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params;
  
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editNotes, setEditNotes] = useState(item.notes || '');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Animasyon değerleri
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const { updateQuantity, updateItemNotes, removeItem } = useCartStore();

  // Animasyon fonksiyonları
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // Ekran açılış animasyonu
  useEffect(() => {
    animateIn();
  }, []);

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '₺0.00';
    return `₺${numPrice.toFixed(2)}`;
  };

  // Resim URL'sini Supabase Storage'dan al
  const getImageUri = (resimPath) => {
    const STORAGE_BUCKET = 'images';
    
    if (!resimPath) return null;
    
    // Eğer zaten tam URL ise direkt kullan
    if (typeof resimPath === 'string' && /^https?:\/\//i.test(resimPath)) {
      return resimPath;
    }
    
    // Supabase Storage'dan public URL oluştur
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(resimPath);
    return data?.publicUrl || null;
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity === 0) {
      setShowDeleteModal(true);
    } else {
      setEditQuantity(newQuantity);
    }
  };

  const handleSave = () => {
    // Quantity'yi güncelle
    updateQuantity(item.id, item.customizations, editQuantity);
    
    // Notes'u güncelle
    updateItemNotes(item.id, item.customizations, editNotes);
    
    // Animasyon ile çık
    animateOut(() => {
      navigation.goBack();
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    removeItem(item.id, item.customizations || {});
    setShowDeleteModal(false);
    // Animasyon ile çık
    animateOut(() => {
      navigation.goBack();
    });
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const customizationsText = item.customizations && Object.values(item.customizations).length > 0 
    ? Object.values(item.customizations)
        .map(customization => customization?.name || '')
        .filter(name => name)
        .join(', ')
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader 
        showBackButton={true}
        onBackPress={() => {
          animateOut(() => {
            navigation.goBack();
          });
        }}
        onSidebarPress={() => setSidebarVisible(true)} 
      />

      <Animated.View 
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.productInfo}>
            <View style={styles.productImageContainer}>
              {getImageUri(item.image) ? (
                <Image source={{ uri: getImageUri(item.image) }} style={styles.productImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="cafe" size={48} color="#8B4513" />
                </View>
              )}
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>{formatPrice(item.price || 0)}</Text>
              {customizationsText && (
                <Text style={styles.customizations}>
                  {customizationsText}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.quantitySection}>
            <Text style={styles.sectionLabel}>Adet</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(editQuantity - 1)}
              >
                <Ionicons name="remove" size={20} color="#8B4513" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{editQuantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setEditQuantity(editQuantity + 1)}
              >
                <Ionicons name="add" size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notlar</Text>
            <TextInput
              style={styles.notesInput}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Ürün için not ekleyin..."
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Ürünü Sil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Animated.View>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Ürünü Sil</Text>
            </View>
            
            <Text style={styles.deleteModalDescription}>
              {item.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteModalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: 8,
  },
  customizations: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  quantitySection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 8,
    alignSelf: 'center',
    width: 150,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  notesSection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  deleteModalTitle: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    marginBottom: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#6B7280',
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: 'white',
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: '600',
  },
});
