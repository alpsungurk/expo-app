import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import { getImageUrl } from '../utils/storage';
import Constants from 'expo-constants';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  
  // Animasyon için ref'ler
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [animatingDirection, setAnimatingDirection] = useState(null);
  
  // Card genişliği ve margin hesaplaması
  const horizontalPadding = getResponsiveValue(16, 20, 24, 28);
  const cardMargin = getResponsiveValue(8, 10, 12, 14);
  const cardWidth = width - (horizontalPadding * 2);

  // Database'den verileri yükle
  useEffect(() => {
    loadData();
  }, []);

  // Items değiştiğinde animasyonu sıfırla
  useEffect(() => {
    if (items.length > 0) {
      slideAnim.setValue(0);
      setAnimatingDirection(null);
    }
  }, [items.length]);

  // Sağ ok butonuna tıklandığında
  const handleNext = useCallback(() => {
    if (items.length === 0) return;
    animateTransition('next', () => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex === items.length - 1) {
          return 0; // İlk item'a git
        }
        return prevIndex + 1;
      });
    });
  }, [items.length, currentIndex]);

  // Otomatik geçiş
  useEffect(() => {
    if (items.length <= 1) return; // Tek kart varsa otomatik geçiş yok
    if (isPressing) return; // Basılı tutulduğunda otomatik geçiş yok
    if (animatingDirection) return; // Animasyon sırasında otomatik geçiş yok

    const interval = setInterval(() => {
      handleNext();
    }, 5000); // 5 saniyede bir geçiş

    return () => clearInterval(interval);
  }, [items.length, isPressing, animatingDirection, handleNext]);

  // Geçiş animasyonu
  const animateTransition = (direction, callback) => {
    // Önce mevcut index'i kaydet (kayarken gösterilecek kart)
    setPrevIndex(currentIndex);
    
    // Yeni kartı başlangıç pozisyonuna getir (render öncesi)
    // Prev (soldaki buton): yeni kart soldan gelir (-width'den), mevcut kart sağa kayar
    // Next (sağdaki buton): yeni kart sağdan gelir (width'den), mevcut kart sola kayar
    slideAnim.setValue(direction === 'prev' ? -width : width);
    
    // Animasyon yönünü set et
    setAnimatingDirection(direction);
    
    // Index'i değiştir (yeni kart render edilsin)
    callback();
    
    // requestAnimationFrame ile bir sonraki frame'de animasyonu başlat
    // Bu, yeni kartın render edilmesi için zaman tanır
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Her iki kartı da aynı anda kaydır - mevcut kart çıkarken yeni kart giriyor
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setAnimatingDirection(null);
        });
      });
    });
  };

  // Sol ok butonuna tıklandığında
  const handlePrevious = () => {
    if (items.length === 0) return;
    animateTransition('prev', () => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex === 0) {
          return items.length - 1; // Son item'a git
        }
        return prevIndex - 1;
      });
    });
  };


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
      // Sadece aktif olanları göster
      const allItems = [
        ...(campaignsData || []).filter(item => item.aktif === true).map(item => ({ ...item, type: 'campaign' })),
        ...(announcementsData || []).filter(item => item.aktif === true).map(item => ({ ...item, type: 'announcement' })),
        ...(suggestionsData || []).filter(item => item.aktif === true).map(item => ({ ...item, type: 'suggestion' }))
      ].sort((a, b) => (b.oncelik || 0) - (a.oncelik || 0));

      setItems(allItems);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Carousel veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };


  // Resim URL'i oluştur
  const getImageUri = (item) => {
    let raw = (
      item.resim_path ||
      item.image_url ||
      item.resimUrl ||
      item.banner_url ||
      item.gorsel_url ||
      item.image
    );

    return getImageUrl(raw);
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

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const imageUri = getImageUri(currentItem);

  return (
    <View style={styles.container}>
      <View style={styles.carouselWrapper}>
        {/* Kart */}
        <View style={styles.cardContainer}>
          {/* Mevcut kart - kayarken (sadece animasyon sırasında görünür) */}
          {animatingDirection && (
            <Animated.View
              style={[
                styles.animatedCardWrapper,
                styles.animatedCardAbsolute,
                {
                  transform: [{ 
                    translateX: slideAnim.interpolate({
                      // Prev (soldaki buton): slideAnim -width'den 0'a giderken, mevcut kart 0'dan width'e kayar (sağa)
                      // Next (sağdaki buton): slideAnim width'den 0'a giderken, mevcut kart 0'dan -width'e kayar (sola)
                      // inputRange artan sırada olmalı
                      inputRange: animatingDirection === 'prev' ? [-width, 0] : [0, width],
                      outputRange: animatingDirection === 'prev' ? [0, width] : [-width, 0],
                    })
                  }],
                  opacity: slideAnim.interpolate({
                    inputRange: animatingDirection === 'prev' ? [-width, 0] : [0, width],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.card, { width: cardWidth }]}
                activeOpacity={0.8}
                disabled
              >
                {(() => {
                  const leavingItem = items[prevIndex];
                  if (!leavingItem) return null;
                  
                  const leavingImageUri = getImageUri(leavingItem);
                  
                  return leavingImageUri ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: leavingImageUri }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      <View style={styles.badgeOverlay}>
                        <Text style={styles.badgeText}>
                          {getBadgeText(leavingItem)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.placeholder}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {getBadgeText(leavingItem)}
                        </Text>
                      </View>
                      <View style={styles.content}>
                        <Text style={styles.title} numberOfLines={2}>
                          {getTitle(leavingItem)}
                        </Text>
                        {getDescription(leavingItem) && (
                          <Text style={styles.description} numberOfLines={3}>
                            {getDescription(leavingItem)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name={leavingItem.type === 'campaign' ? 'gift' : leavingItem.type === 'announcement' ? 'megaphone' : 'bulb'}
                          size={getResponsiveValue(32, 40, 48, 56)}
                          color="#6B4E3D"
                        />
                      </View>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* Yeni kart - girerken */}
          <Animated.View
            style={[
              styles.animatedCardWrapper,
              {
                transform: [{ translateX: slideAnim }],
                opacity: animatingDirection ? slideAnim.interpolate({
                  inputRange: animatingDirection === 'prev' ? [-width, 0] : [0, width],
                  outputRange: animatingDirection === 'prev' ? [0, 1] : [1, 0],
                  extrapolate: 'clamp',
                }) : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.card, { width: cardWidth }]}
              activeOpacity={0.8}
              onPress={() => handleItemPress(currentItem)}
              onPressIn={() => setIsPressing(true)}
              onPressOut={() => setIsPressing(false)}
            >
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {/* Resim varsa bile badge göster */}
                <View style={styles.badgeOverlay}>
                  <Text style={styles.badgeText}>{getBadgeText(currentItem)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getBadgeText(currentItem)}</Text>
                </View>
                
                <View style={styles.content}>
                  <Text style={styles.title} numberOfLines={3}>
                    {getTitle(currentItem)}
                  </Text>
                  {getDescription(currentItem) && (
                    <Text style={styles.description} numberOfLines={4}>
                      {getDescription(currentItem)}
                    </Text>
                  )}
                </View>
                
                {/* İkon sağ alt köşede */}
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={currentItem.type === 'campaign' ? 'gift' : currentItem.type === 'announcement' ? 'megaphone' : 'bulb'}
                    size={getResponsiveValue(32, 40, 48, 56)}
                    color="#6B4E3D"
                  />
                </View>
              </View>
            )}
            </TouchableOpacity>
          </Animated.View>

          {/* Sol ok butonu - Kartın üstünde */}
          {items.length > 1 && (
            <TouchableOpacity
              style={styles.arrowButtonLeft}
              onPress={handlePrevious}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={getResponsiveValue(20, 22, 24, 26)}
                color="white"
              />
            </TouchableOpacity>
          )}

          {/* Sağ ok butonu - Kartın üstünde */}
          {items.length > 1 && (
            <TouchableOpacity
              style={styles.arrowButtonRight}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={getResponsiveValue(20, 22, 24, 26)}
                color="white"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Indicator dots */}
      {items.length > 1 && (
        <View style={styles.dotsContainer}>
          {items.map((_, index) => (
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
  carouselWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden', // Animasyon sırasında taşmayı önle
  },
  animatedCardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedCardAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  arrowButtonLeft: {
    position: 'absolute',
    left: getResponsiveValue(20, 22, 24, 26),
    top: '50%',
    marginTop: getResponsiveValue(-16, -18, -20, -22),
    width: getResponsiveValue(32, 36, 40, 44),
    height: getResponsiveValue(32, 36, 40, 44),
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  arrowButtonRight: {
    position: 'absolute',
    right: getResponsiveValue(20, 22, 24, 26),
    top: '50%',
    marginTop: getResponsiveValue(-16, -18, -20, -22),
    width: getResponsiveValue(32, 36, 40, 44),
    height: getResponsiveValue(32, 36, 40, 44),
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  loadingContainer: {
    height: getResponsiveValue(160, 200, 240, 280),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    marginHorizontal: getResponsiveValue(24, 28, 32, 36),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B4E3D',
    marginTop: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  card: {
    height: getResponsiveValue(200, 240, 280, 320), // Yükseklik artırıldı
    marginHorizontal: getResponsiveValue(8, 10, 12, 14), // Card'lar arası margin
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    overflow: 'hidden',
    backgroundColor: '#efe7df',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  badgeOverlay: {
    position: 'absolute',
    top: getResponsiveValue(12, 14, 16, 18),
    left: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: '#6B4E3D',
    paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
    paddingVertical: getResponsiveValue(4, 5, 6, 7),
    borderRadius: getResponsiveValue(6, 8, 10, 12),
    zIndex: 5,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    padding: getResponsiveValue(16, 18, 20, 22),
  },
  badge: {
    backgroundColor: '#6B4E3D',
    paddingHorizontal: getResponsiveValue(10, 12, 14, 16),
    paddingVertical: getResponsiveValue(5, 6, 7, 8),
    borderRadius: getResponsiveValue(8, 10, 12, 14),
    alignSelf: 'flex-start',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
  },
  badgeText: {
    color: 'white',
    fontSize: getResponsiveValue(11, 12, 13, 14),
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingLeft: getResponsiveValue(60, 65, 70, 75), // Sol ok için alan bırak
    paddingRight: getResponsiveValue(60, 65, 70, 75), // Sağ ok için alan bırak
    width: '100%',
  },
  title: {
    fontSize: getResponsiveValue(22, 26, 30, 34),
    fontWeight: '700',
    color: '#4A3429',
    marginBottom: getResponsiveValue(12, 14, 16, 18),
    fontFamily: 'System',
    lineHeight: getResponsiveValue(28, 32, 36, 40),
  },
  description: {
    fontSize: getResponsiveValue(14, 16, 18, 20),
    color: '#6B4E3D',
    fontFamily: 'System',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
    marginTop: getResponsiveValue(4, 6, 8, 10),
  },
  iconContainer: {
    position: 'absolute',
    bottom: getResponsiveValue(12, 14, 16, 18),
    right: getResponsiveValue(12, 14, 16, 18),
    opacity: 0.3,
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

