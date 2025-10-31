import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';

const { width } = Dimensions.get('window');
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

export default function CampaignCarousel() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isScrolling = useRef(false);
  const [originalItems, setOriginalItems] = useState([]);
  
  const cardWidth = width - getResponsiveValue(32, 40, 48, 56);

  // Database'den verileri yükle
  useEffect(() => {
    loadData();
  }, []);

  // Infinite scroll için items'ı 3 kez tekrarla
  const allItems = originalItems.length > 0 ? [
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-1-${index}` })),
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-2-${index}` })),
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-3-${index}` }))
  ] : [];

  // Component mount olduğunda orta bölümde başla (infinite scroll için)
  useEffect(() => {
    if (originalItems.length > 0) {
      const originalLength = originalItems.length;
      const startIndex = originalLength; // Orta bölümde başla
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: startIndex * cardWidth,
          animated: false,
        });
        // Indicator için gerçek index'i ayarla (0 olmalı çünkü orta bölümde başlıyoruz)
        setCurrentIndex(0);
      }, 100);
    }
  }, [originalItems.length, cardWidth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const nowISOString = now.toISOString();

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
        .order('oncelik', { ascending: false })
        .order('id', { ascending: true });

      if (announcementsError) throw announcementsError;

      // Yeni önerileri yükle
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from(TABLES.YENI_ONERILER)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (suggestionsError) throw suggestionsError;

      // Tüm öğeleri birleştir ve öncelik sırasına göre sırala
      const allItems = [
        ...(campaignsData || []).map(item => ({ ...item, type: 'campaign' })),
        ...(announcementsData || []).map(item => ({ ...item, type: 'announcement' })),
        ...(suggestionsData || []).map(item => ({ ...item, type: 'suggestion' }))
      ].sort((a, b) => (b.oncelik || 0) - (a.oncelik || 0));

      setOriginalItems(allItems);
    } catch (error) {
      console.error('Carousel veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll handler - indicator'ları eş zamanlı güncelle (infinite scroll uyumlu)
  const handleScroll = (event) => {
    if (isScrolling.current) return;
    
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    
    if (originalItems.length > 0 && index >= 0 && index < allItems.length) {
      const originalLength = originalItems.length;
      // Gerçek index'i hesapla (modulo ile infinite scroll uyumlu)
      const realIndex = index % originalLength;
      
      // Indicator'ı sadece gerçekten değiştiyse güncelle
      if (realIndex !== currentIndex) {
        setCurrentIndex(realIndex);
      }
    }
  };

  // Scroll end handler - infinite scroll mantığı ve indicator güncellemesi
  const handleScrollEnd = (event) => {
    if (isScrolling.current) return;
    
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    
    if (originalItems.length > 0 && index >= 0 && index < allItems.length) {
      const originalLength = originalItems.length;
      
      // Gerçek index'i hesapla ve indicator'ı güncelle
      const realIndex = index % originalLength;
      setCurrentIndex(realIndex);
      
      // Eğer ilk bölümdeyse (index 0 - originalLength-1), son bölüme geç
      if (index < originalLength) {
        // Son bölümdeki aynı pozisyona geç
        const targetIndex = realIndex + originalLength * 2;
        isScrolling.current = true;
        scrollViewRef.current?.scrollTo({
          x: targetIndex * cardWidth,
          animated: false,
        });
        setTimeout(() => {
          isScrolling.current = false;
        }, 100);
      }
      // Eğer son bölümdeyse (index >= originalLength * 2), ilk bölüme geç
      else if (index >= originalLength * 2) {
        // İlk bölümdeki aynı pozisyona geç
        const targetIndex = realIndex;
        isScrolling.current = true;
        scrollViewRef.current?.scrollTo({
          x: targetIndex * cardWidth,
          animated: false,
        });
        setTimeout(() => {
          isScrolling.current = false;
        }, 100);
      }
    }
  };

  // Resim URL'i oluştur
  const getImageUri = (item) => {
    const STORAGE_BUCKET = 'images';
    let raw = (
      item.resim_path ||
      item.image_url ||
      item.resimUrl ||
      item.banner_url ||
      item.gorsel_url ||
      item.image
    );

    if (!raw) return null;
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
    
    // Path temizleme: Başındaki /images/ veya / karakterini kaldır
    let cleanPath = raw;
    if (typeof cleanPath === 'string') {
      // /images/kahvalti.jpg -> kahvalti.jpg
      cleanPath = cleanPath.replace(/^\/images\//, '');
      // /kahvalti.jpg -> kahvalti.jpg
      cleanPath = cleanPath.replace(/^\//, '');
      // images/kahvalti.jpg -> kahvalti.jpg (bucket adını da kaldır)
      cleanPath = cleanPath.replace(/^images\//, '');
    }
    
    try {
      const { data, error } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(cleanPath);
      if (error) {
        return null;
      }
      return data?.publicUrl || null;
    } catch (error) {
      return null;
    }
  };

  // Başlık al
  const getTitle = (item) => {
    if (item.type === 'campaign') return item.ad;
    if (item.type === 'announcement') return item.baslik;
    if (item.type === 'suggestion') return item.baslik;
    return item.ad || item.baslik;
  };

  // Açıklama al
  const getDescription = (item) => {
    if (item.type === 'campaign') return item.aciklama;
    if (item.type === 'announcement') return item.icerik;
    if (item.type === 'suggestion') return item.aciklama;
    return item.aciklama || item.icerik;
  };

  // Badge text
  const getBadgeText = (item) => {
    if (item.type === 'campaign') return 'Kampanya';
    if (item.type === 'announcement') return 'Duyuru';
    if (item.type === 'suggestion') return 'Öneri';
    return 'Bilgi';
  };

  // Item'a tıklandığında
  const handleItemPress = async (item) => {
    if (item.type === 'announcement') {
      // Duyuru → AnnouncementDetail (tur belirtilmez, duyuru olarak gider)
      navigation.navigate('AnnouncementDetail', { announcement: item });
    } else if (item.type === 'campaign') {
      // Kampanya → AnnouncementDetail (tur: 'kampanya' eklenir)
      navigation.navigate('AnnouncementDetail', { announcement: { ...item, tur: 'kampanya' } });
    } else if (item.type === 'suggestion') {
      // Yeni öneri → ProductDetail (urun_id ile ürün çekilir)
      if (item.urun_id) {
        try {
          const { data: productData, error } = await supabase
            .from(TABLES.URUNLER)
            .select('*')
            .eq('id', item.urun_id)
            .eq('aktif', true)
            .single();

          if (error) {
            console.error('Ürün çekme hatası:', error);
            return;
          }

          if (productData) {
            navigation.navigate('ProductDetail', { product: productData });
          }
        } catch (error) {
          console.error('Ürün yükleme hatası:', error);
        }
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cafe" size={32} color="#6B4E3D" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (allItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="center"
      >
        {allItems.map((item, index) => {
          const imageUri = getImageUri(item);
          
          return (
            <TouchableOpacity
              key={item.uniqueKey || `${item.type}-${item.id}-${index}`}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleItemPress(item)}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons
                    name={item.type === 'campaign' ? 'gift' : item.type === 'announcement' ? 'megaphone' : 'bulb'}
                    size={getResponsiveValue(40, 48, 56, 64)}
                    color="#6B4E3D"
                  />
                </View>
              )}
              
              {/* Badge ve yazılar - resim yoksa göster */}
              {!imageUri && (
                <View style={styles.contentContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getBadgeText(item)}</Text>
                  </View>
                  
                  <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>
                      {getTitle(item)}
                    </Text>
                    {getDescription(item) && (
                      <Text style={styles.description} numberOfLines={2}>
                        {getDescription(item)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {originalItems.length > 1 && (
        <View style={styles.dotsContainer}>
          {originalItems.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: getResponsiveValue(12, 16, 20, 24),
    marginBottom: getResponsiveValue(16, 20, 24, 28),
  },
  loadingContainer: {
    height: getResponsiveValue(220, 260, 300, 340),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B4E3D',
    marginTop: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  card: {
    width: width - getResponsiveValue(32, 40, 48, 56),
    height: getResponsiveValue(220, 260, 300, 340),
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    overflow: 'hidden',
    backgroundColor: '#efe7df',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: getResponsiveValue(12, 14, 16, 18),
  },
  badge: {
    backgroundColor: '#6B4E3D',
    paddingHorizontal: getResponsiveValue(10, 12, 14, 16),
    paddingVertical: getResponsiveValue(4, 5, 6, 7),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    alignSelf: 'flex-start',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  badgeText: {
    color: 'white',
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: getResponsiveValue(16, 18, 20, 22),
    fontWeight: 'bold',
    color: '#4A3429',
    marginBottom: getResponsiveValue(4, 5, 6, 7),
    fontFamily: 'System',
  },
  description: {
    fontSize: getResponsiveValue(13, 14, 15, 16),
    color: '#6B4E3D',
    fontFamily: 'System',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveValue(12, 16, 20, 24),
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  dot: {
    width: getResponsiveValue(6, 8, 10, 12),
    height: getResponsiveValue(6, 8, 10, 12),
    borderRadius: getResponsiveValue(3, 4, 5, 6),
    backgroundColor: '#D1D5DB',
    marginHorizontal: getResponsiveValue(3, 4, 5, 6),
  },
  activeDot: {
    backgroundColor: '#8B4513',
    width: getResponsiveValue(8, 10, 12, 14),
    height: getResponsiveValue(8, 10, 12, 14),
    borderRadius: getResponsiveValue(4, 5, 6, 7),
  },
});

