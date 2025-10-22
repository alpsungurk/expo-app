import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';

const { width } = Dimensions.get('window');

const AnnouncementDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { announcement } = route.params;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Kampanya mı duyuru mu kontrol et
  const isCampaign = announcement.tur === 'kampanya' || announcement.baslik?.toLowerCase().includes('kampanya');
  const pageTitle = isCampaign ? 'Kampanya Detayı' : 'Duyuru Detayı';

  // Animasyon fonksiyonları
  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  };

  // Geri buton handler
  const handleGoBack = () => {
    slideOut();
  };

  // Component mount olduğunda animasyonu başlat
  useEffect(() => {
    slideIn();
  }, []);

  // Resim URL'sini oluştur
  const getImageUri = () => {
    const STORAGE_BUCKET = 'images';
    let raw = (
      announcement.resim_url ||
      announcement.resim_path ||
      announcement.image_url ||
      announcement.banner_url ||
      announcement.gorsel_url ||
      announcement.image
    );
    
    if (!raw) return null;
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
    // Build public URL via Supabase Storage for path-only values
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(raw);
    return data?.publicUrl || null;
  };

  const imageUri = getImageUri();

  const getResponsiveValue = (small, medium, large, xlarge) => {
    if (width < 375) return small;
    if (width < 414) return medium;
    if (width < 768) return large;
    return xlarge;
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Dimensions.get('window').height],
              }),
            },
          ],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image or Title Header */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
             <View style={styles.imageOverlay}>
               <Text style={styles.imageTitle}>Kahve İndirimi</Text>
               <Text style={styles.imageDescription}>Tüm kahvelerde %20 indirim</Text>
               <View style={styles.imageDateContainer}>
                 <Ionicons name="calendar" size={14} color="white" />
                 <Text style={styles.imageDateText}>
                   {announcement.baslangic_tarihi ? 
                     `${new Date(announcement.baslangic_tarihi).toLocaleDateString('tr-TR', {
                       day: '2-digit',
                       month: '2-digit',
                       year: 'numeric',
                     })} - ${announcement.bitis_tarihi ? new Date(announcement.bitis_tarihi).toLocaleDateString('tr-TR', {
                       day: '2-digit',
                       month: '2-digit',
                       year: 'numeric',
                     }) : '31.12.2025'}` :
                     '01.01.2024 - 31.12.2025'
                   }
                 </Text>
               </View>
             </View>
          </View>
        ) : (
          <View style={styles.titleHeader}>
            <Text style={styles.titleHeaderText}>{announcement.baslik || 'Kahve İndirimi'}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.textContainer}>
          {/* Resim yoksa başlık göster */}
          {!imageUri && (
            <Text style={styles.smallTitle}>
              {announcement.baslik || 'Kahve İndirimi'}
            </Text>
          )}
          
          {/* Açıklama - ufak boyutlu */}
          <Text style={styles.smallDescription}>
            {announcement.duyuru_aciklama || 
             announcement.kampanya_aciklama || 
             announcement.aciklama || 
             announcement.icerik || 
             'Tüm kahvelerde %20 indirim'}
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    paddingBottom: 30,
  },
  imageTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  imageDescription: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  imageDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageDateText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: 8,
  },
  titleHeader: {
    backgroundColor: '#8B4513',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleHeaderText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 36,
  },
  textContainer: {
    padding: 20,
  },
  smallTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
    fontFamily: 'System',
  },
  smallDescription: {
    fontSize: 16,
    color: '#8B4513',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'System',
    fontWeight: '500',
  },
  smallDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  smallDateText: {
    fontSize: 14,
    color: '#8B4513',
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: 'System',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 14,
    color: '#8B4513',
    marginLeft: 8,
    fontWeight: '500',
    fontFamily: 'System',
  },
});

export default AnnouncementDetailScreen;
