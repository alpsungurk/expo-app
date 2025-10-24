import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store/appStore';
import { supabase } from '../config/supabase';

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

// Daha küçük bar için - responsive breakpoints
const getBarWidth = () => {
  if (isTablet) return width * 0.4; // Tablet daha küçük bar - %40
  if (isLargeScreen) return width * 0.5; // Large phones - %50
  if (isMediumScreen) return width * 0.7; // Medium phones - %70
  return width * 0.8; // Small phones - %80
};

const getBarMargin = () => {
  const barWidth = getBarWidth();
  return (width - barWidth) / 2;
};

const BAR_WIDTH = getBarWidth();
const BAR_MARGIN = getBarMargin();

export default function CampaignSlider({ loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(0)).current;
  const autoScrollInterval = useRef(null);
  const isScrolling = useRef(false);
  const { campaigns, announcements, getActiveCampaigns, getActiveAnnouncements, yeniOneriler, getActiveYeniOneriler, activeOrder } = useAppStore();

  const activeCampaigns = getActiveCampaigns();
  const activeAnnouncements = getActiveAnnouncements();
  const activeYeniOneriler = getActiveYeniOneriler();

  // Sadece aktif öğeleri al, öncelik sırasına göre
  const originalItems = [
    ...activeCampaigns.map(campaign => ({ ...campaign, type: 'campaign' })),
    ...activeAnnouncements.map(announcement => ({ ...announcement, type: 'announcement' })),
    ...activeYeniOneriler.map(o => ({ ...o, type: 'suggestion' }))
  ].sort((a, b) => (b.oncelik || 0) - (a.oncelik || 0));

  // Infinite scroll için items'ı 3 kez tekrarla - unique key'ler ile
  const allItems = originalItems.length > 0 ? [
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-1-${index}` })),
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-2-${index}` })),
    ...originalItems.map((item, index) => ({ ...item, uniqueKey: `${item.type}-${item.id}-3-${index}` }))
  ] : [];

  // Debug bilgileri kaldırıldı

  // Otomatik scroll fonksiyonu - infinite scroll mantığı
  const startAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
    }
    
    if (originalItems.length > 1) {
      autoScrollInterval.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * width, // Tam ekran genişliği
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }
  };

  // Otomatik scroll'u durdur
  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  // Touch event'leri
  const handleTouchStart = () => {
    stopAutoScroll();
  };

  const handleTouchEnd = () => {
    // Touch bittikten 2 saniye sonra otomatik scroll'u yeniden başlat
    setTimeout(() => {
      startAutoScroll();
    }, 2000);
  };

  useEffect(() => {
    startAutoScroll();
    
    return () => {
      stopAutoScroll();
    };
  }, [originalItems.length]);

  // Component mount olduğunda orta bölümde başla
  useEffect(() => {
    if (originalItems.length > 0) {
      const originalLength = originalItems.length;
      const startIndex = originalLength; // Orta bölümde başla
      setCurrentIndex(startIndex);
      
      // ScrollView'ı orta bölümde başlat
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: startIndex * width,
          animated: false,
        });
      }, 100);
    }
  }, [originalItems.length]);

  // Loading bittikten sonra slide-in animasyonu
  useEffect(() => {
    if (!loading && allItems.length > 0) {
      Animated.timing(slideInAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } else {
      slideInAnim.setValue(0);
    }
  }, [loading, allItems.length]);

  // Sipariş durumu animasyonu - biraz daha belirgin
  useEffect(() => {
    if (activeOrder && activeOrder.durum === 'hazirlaniyor') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeOrder]);

  const handleScroll = (event) => {
    if (isScrolling.current) return;
    
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    
    if (index !== currentIndex && index >= 0 && index < allItems.length) {
      // Infinite scroll mantığı - orta bölümde kal
      if (originalItems.length > 0) {
        const originalLength = originalItems.length;
        
        // Eğer ilk bölümdeyse (0 - originalLength-1), son bölüme geç
        if (index < originalLength) {
          // Önce dots'ı doğru pozisyonda göster
          setCurrentIndex(index + originalLength * 2);
          setTimeout(() => {
            isScrolling.current = true;
            scrollViewRef.current?.scrollTo({
              x: (index + originalLength * 2) * width,
              animated: false,
            });
            setTimeout(() => {
              isScrolling.current = false;
            }, 100);
          }, 50);
        }
        // Eğer son bölümdeyse (originalLength*2 - originalLength*3-1), ilk bölüme geç
        else if (index >= originalLength * 2) {
          // Önce dots'ı doğru pozisyonda göster
          setCurrentIndex(index - originalLength * 2);
          setTimeout(() => {
            isScrolling.current = true;
            scrollViewRef.current?.scrollTo({
              x: (index - originalLength * 2) * width,
              animated: false,
            });
            setTimeout(() => {
              isScrolling.current = false;
            }, 100);
          }, 50);
        } else {
          // Orta bölümdeyse normal güncelle
          setCurrentIndex(index);
        }
      } else {
        setCurrentIndex(index);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={styles.loadingIcon}>
            <Ionicons name="cafe" size={40} color="#6B4E3D" />
          </Animated.View>
          <Text style={styles.loadingText}>Kampanyalar yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (allItems.length === 0) {
    return null;
  }

  const renderItem = (item, index) => {
    const isCampaign = item.type === 'campaign';
    const isAnnouncement = item.type === 'announcement';
    const isSuggestion = item.type === 'suggestion';
    
    // Debug kaldırıldı

    // Her öğe için farklı renk paleti
    const getGradientColors = () => {
      if (isCampaign) return ['#8B4513', '#A0522D'];
      if (isAnnouncement) return ['#6B7280', '#4B5563'];
      if (isSuggestion) return ['#059669', '#047857'];
      return ['#8B4513', '#A0522D'];
    };

    const STORAGE_BUCKET = 'images'; // bucket name provided by user
    const getImageUri = () => {
      // Try common keys for image fields
      let raw = (
        item.resim_path ||
        item.image_url ||
        item.resimUrl ||
        item.banner_url ||
        item.gorsel_url ||
        item.image
      );
      
      // Yeni öneri için sadece kendi resmi varsa kullan, ürün resmini kullanma
      if (isSuggestion) {
        if (!raw) return null; // Yeni öneri için resim yoksa null döndür
      } else {
        // Kampanya ve duyuru için ürün resmi kullanılabilir
        if (!raw && item.urunler?.resim_path) {
          raw = item.urunler.resim_path;
        }
      }
      
      if (!raw) return null;
      if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
      // Build public URL via Supabase Storage for path-only values
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(raw);
      return data?.publicUrl || null;
    };

    const getIcon = () => {
      if (isCampaign) return "gift";
      if (isAnnouncement) return "megaphone";
      if (isSuggestion) return "bulb";
      return "information-circle";
    };

    const getBadgeText = () => {
      if (isCampaign) return 'Kampanya';
      if (isAnnouncement) return 'Duyuru';
      if (isSuggestion) return 'Öneri';
      return 'Bilgi';
    };

    const getTitle = () => {
      if (isCampaign) return item.ad;
      if (isAnnouncement) return item.baslik;
      if (isSuggestion) {
        // Sadece yeni önerinin kendi başlığını kullan
        return item.baslik;
      }
      return item.ad || item.baslik;
    };

    const getDescription = () => {
      if (isCampaign) return item.aciklama;
      if (isAnnouncement) return item.icerik;
      if (isSuggestion) {
        // Sadece yeni önerinin kendi açıklamasını kullan
        return item.aciklama;
      }
      return item.aciklama || item.icerik;
    };

    return (
      <View key={item.uniqueKey} style={styles.slideContainer}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
        >
          {/* Modern Card Design */}
          <View style={styles.modernCard}>
            {/* Background Image */}
            {getImageUri() ? (
              <Image
                source={{ uri: getImageUri() }}
                style={styles.modernBgImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modernBgPlaceholder}>
                <Ionicons
                  name={getIcon()}
                  size={getResponsiveValue(60, 70, 80, 90)}
                  color="#6B4E3D"
                />
              </View>
            )}
            
            {/* Content Overlay - sadece resim yoksa göster */}
            {!getImageUri() && (
              <View style={styles.modernContentOverlay}>
                {/* Header with Badge */}
                <View style={styles.modernHeader}>
                  <View style={styles.modernBadge}>
                    <Text style={styles.modernBadgeText}>
                      {getBadgeText()}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.modernContent}>
                  <Text style={styles.modernTitle} numberOfLines={2}>
                    {getTitle()}
                  </Text>
                  <Text style={styles.modernDescription} numberOfLines={3}>
                    {getDescription()}
                  </Text>
                </View>
              </View>
            )}

            {/* Resim varsa sadece badge */}
            {getImageUri() && (
              <View style={styles.imageOverlay}>
                <View style={styles.modernHeader}>
                  <View style={styles.modernBadge}>
                    <Text style={styles.modernBadgeText}>
                      {getBadgeText()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: slideInAnim,
        transform: [{
          translateY: slideInAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          })
        }]
      }
    ]}>
      {/* Sipariş Durumu Göstergesi - Kaldırıldı */}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScrollBeginDrag={handleTouchStart}
        onScrollEndDrag={handleTouchEnd}
        style={[styles.scrollView, { height: getResponsiveValue(220, 240, 280, 300) }]}
      >
        {allItems.map((item, index) => renderItem(item, index))}
      </ScrollView>

      {originalItems.length > 1 && (
        <View style={styles.dotsContainer}>
          {originalItems.map((_, index) => {
            // Infinite scroll için gerçek index'i hesapla
            const realIndex = currentIndex % originalItems.length;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === realIndex && styles.activeDot
                ]}
              />
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: getResponsiveValue(12, 16, 20, 24),
    marginBottom: getResponsiveValue(16, 20, 24, 28),
  },
  // Sipariş Durumu Göstergesi
  orderStatusContainer: {
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
    marginBottom: getResponsiveValue(12, 16, 20, 24),
  },
  orderStatusCard: {
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    padding: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  orderStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusIcon: {
    width: getResponsiveValue(40, 44, 48, 52),
    height: getResponsiveValue(40, 44, 48, 52),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveValue(12, 14, 16, 18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  orderStatusTextContainer: {
    flex: 1,
  },
  orderStatusTitle: {
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(2, 3, 4, 5),
  },
  orderStatusSubtitle: {
    fontWeight: '500',
    fontFamily: 'System',
    opacity: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveValue(12, 16, 20, 24),
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  dot: {
    width: getResponsiveValue(8, 10, 12, 14),
    height: getResponsiveValue(8, 10, 12, 14),
    borderRadius: getResponsiveValue(4, 5, 6, 7),
    backgroundColor: '#D1D5DB', // Gri renk
    marginHorizontal: getResponsiveValue(4, 5, 6, 8),
  },
  activeDot: {
    backgroundColor: '#a76908', // Yeşil renk
    transform: [{ scale: getResponsiveValue(1.2, 1.3, 1.4, 1.5) }],
  },
  moreDots: {
    fontSize: getResponsiveValue(10, 12, 14, 16),
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    // height artık inline olarak veriliyor
  },
  scrollContent: {
    alignItems: 'center',
  },
  slideContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  card: {
    width: width - getResponsiveValue(24, 32, 40, 48),
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Modern Card Styles
  modernCard: {
    backgroundColor: '#efe7df',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    minHeight: getResponsiveValue(200, 220, 240, 260),
    position: 'relative',
    overflow: 'hidden',
  },
  modernBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modernBgPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
  },
  modernContentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: getResponsiveValue(20, 22, 24, 26),
    justifyContent: 'space-between',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: getResponsiveValue(16, 18, 20, 22),
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernIconContainer: {
    width: getResponsiveValue(40, 44, 48, 52),
    height: getResponsiveValue(40, 44, 48, 52),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBadge: {
    backgroundColor: 'rgba(106, 78, 61, 0.8)',
    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
    paddingVertical: getResponsiveValue(6, 7, 8, 10),
    borderRadius: getResponsiveValue(12, 14, 16, 18),
  },
  modernBadgeText: {
    color: 'white',
    fontSize: getResponsiveValue(12, 13, 14, 16),
    fontWeight: '600',
    fontFamily: 'System',
  },
  modernContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modernTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: 'bold',
    color: '#4A3429',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    lineHeight: getResponsiveValue(22, 24, 26, 28),
    fontFamily: 'System',
  },
  modernDescription: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B4E3D',
    lineHeight: getResponsiveValue(20, 22, 24, 26),
    fontFamily: 'System',
  },
  // Loading Styles
  loadingContainer: {
    height: getResponsiveValue(200, 220, 260, 280),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(16, 18, 20, 22),
    marginHorizontal: getResponsiveValue(16, 20, 24, 28),
  },
  loadingIcon: {
    marginBottom: getResponsiveValue(12, 14, 16, 18),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 15, 16, 18),
    color: '#6B4E3D',
    fontWeight: '500',
    fontFamily: 'System',
  },
});
