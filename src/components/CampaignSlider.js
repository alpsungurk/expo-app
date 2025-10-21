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

export default function CampaignSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { campaigns, announcements, getActiveCampaigns, getActiveAnnouncements, yeniOneriler, getActiveYeniOneriler, activeOrder } = useAppStore();

  const activeCampaigns = getActiveCampaigns();
  const activeAnnouncements = getActiveAnnouncements();
  const activeYeniOneriler = getActiveYeniOneriler();

  // Sadece aktif öğeleri al, öncelik sırasına göre
  const allItems = [
    ...activeCampaigns.map(campaign => ({ ...campaign, type: 'campaign' })),
    ...activeAnnouncements.map(announcement => ({ ...announcement, type: 'announcement' })),
    ...activeYeniOneriler.map(o => ({ ...o, type: 'suggestion' }))
  ].sort((a, b) => (b.oncelik || 0) - (a.oncelik || 0));

  // Debug bilgileri kaldırıldı

  useEffect(() => {
    if (allItems.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % allItems.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * width, // Tam ekran genişliği
            animated: true,
          });
          return nextIndex;
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [allItems.length]);

  // Sipariş durumu animasyonu
  useEffect(() => {
    if (activeOrder && activeOrder.durum === 'hazirlaniyor') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
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
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

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
      
      // Eğer yeni öneri için resim yoksa, ürünün resmini kullan
      if (!raw && isSuggestion && item.urunler?.resim_path) {
        raw = item.urunler.resim_path;
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
      <View key={`${item.type}-${item.id}`} style={styles.slideContainer}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
        >
          {/* If there is an image, render it and apply a subtle dark gradient overlay */}
          <LinearGradient
            colors={getImageUri() ? ['rgba(0,0,0,0.20)','rgba(0,0,0,0.55)'] : getGradientColors()}
            style={[
              styles.gradient,
              {
                minHeight: getResponsiveValue(140, 160, 200, 220)
              }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {getImageUri() ? (
              <Image
                source={{ uri: getImageUri() }}
                style={styles.bgImage}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <View style={[
                  styles.iconContainer,
                  {
                    width: getResponsiveValue(50, 55, 70, 75),
                    height: getResponsiveValue(50, 55, 70, 75),
                    borderRadius: getResponsiveValue(25, 27, 35, 37),
                  }
                ]}>
                  <Ionicons
                    name={getIcon()}
                    size={getResponsiveValue(26, 28, 36, 38)}
                    color="white"
                  />
                </View>

                <View style={[
                  styles.badge,
                  {
                    paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
                    paddingVertical: getResponsiveValue(6, 7, 8, 10),
                    borderRadius: getResponsiveValue(12, 14, 16, 18),
                  }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { fontSize: getResponsiveValue(12, 13, 14, 16) }
                  ]}>
                    {getBadgeText()}
                  </Text>
                </View>
              </View>

              <View style={styles.textContainer}>
                 <Text style={[
                   styles.title,
                   {
                     fontSize: getResponsiveValue(18, 20, 24, 26),
                     marginBottom: getResponsiveValue(6, 8, 10, 12),
                     lineHeight: getResponsiveValue(20, 24, 28, 30),
                   }
                 ]} numberOfLines={3}>
                   {getTitle()}
                 </Text>
                 <Text style={[
                   styles.description,
                   {
                     fontSize: getResponsiveValue(12, 14, 16, 18),
                     lineHeight: getResponsiveValue(18, 20, 22, 24),
                   }
                 ]} numberOfLines={4}>
                   {getDescription()}
                 </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sipariş Durumu Göstergesi */}
      {activeOrder && (
        <View style={styles.orderStatusContainer}>
          <Animated.View 
            style={[
              styles.orderStatusCard,
              { 
                backgroundColor: activeOrder.durum === 'hazir' ? '#DCFCE7' : '#FEF3C7',
                transform: [{ scale: activeOrder.durum === 'hazirlaniyor' ? pulseAnim : 1 }]
              }
            ]}
          >
            <View style={styles.orderStatusContent}>
              <Animated.View 
                style={[
                  styles.orderStatusIcon,
                  { 
                    backgroundColor: activeOrder.durum === 'hazir' ? '#10B981' : '#F59E0B',
                    transform: [{ rotate: activeOrder.durum === 'hazirlaniyor' ? pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: ['0deg', '360deg']
                    }) : '0deg' }]
                  }
                ]}
              >
                <Ionicons 
                  name={activeOrder.durum === 'hazir' ? 'checkmark' : 'cafe'} 
                  size={getResponsiveValue(16, 18, 20, 22)} 
                  color="white" 
                />
              </Animated.View>
              
              <View style={styles.orderStatusTextContainer}>
                <Text style={[
                  styles.orderStatusTitle,
                  { 
                    color: activeOrder.durum === 'hazir' ? '#166534' : '#8B4513',
                    fontSize: getResponsiveValue(14, 16, 18, 20)
                  }
                ]}>
                  {activeOrder.durum === 'hazir' ? 'Siparişiniz Hazır!' : 'Siparişiniz Hazırlanıyor'}
                </Text>
                <Text style={[
                  styles.orderStatusSubtitle,
                  { 
                    color: activeOrder.durum === 'hazir' ? '#166534' : '#8B4513',
                    fontSize: getResponsiveValue(11, 12, 13, 14)
                  }
                ]}>
                  {activeOrder.durum === 'hazir' ? 'Masanıza getirilecek' : 'Lütfen bekleyin...'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={width}
        decelerationRate="fast"
        style={[styles.scrollView, { height: getResponsiveValue(160, 180, 220, 240) }]}
      >
        {allItems.map((item, index) => renderItem(item, index))}
      </ScrollView>

      {allItems.length > 1 && (
        <View style={styles.dotsContainer}>
          {allItems.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
              onPress={() => {
                setCurrentIndex(index);
                scrollViewRef.current?.scrollTo({
                  x: index * width,
                  animated: true,
                });
              }}
              activeOpacity={0.7}
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
    width: width - getResponsiveValue(32, 40, 48, 56), // Padding'i çıkar
    borderRadius: getResponsiveValue(16, 20, 24, 28),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: getResponsiveValue(2, 3, 4, 5) 
    },
    shadowOpacity: getResponsiveValue(0.1, 0.12, 0.15, 0.18),
    shadowRadius: getResponsiveValue(8, 10, 12, 14),
    elevation: getResponsiveValue(6, 8, 10, 12),
  },
  gradient: {
    padding: getResponsiveValue(20, 24, 30, 35),
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: getResponsiveValue(16, 20, 24, 28),
    opacity: 0.6,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(14, 16, 20, 24),
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: getResponsiveValue(1, 1, 2, 2),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textContainer: {
    flex: 1,
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    justifyContent: 'flex-end',
  },
  title: {
    fontWeight: 'bold',
    fontFamily: 'System',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { 
      width: 0, 
      height: getResponsiveValue(1, 1, 2, 2) 
    },
    textShadowRadius: getResponsiveValue(2, 3, 4, 5),
  },
  description: {
    fontFamily: 'System',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { 
      width: 0, 
      height: getResponsiveValue(0.5, 1, 1, 1.5) 
    },
    textShadowRadius: getResponsiveValue(1, 2, 3, 4),
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: getResponsiveValue(1, 2, 2, 3) 
    },
    shadowOpacity: getResponsiveValue(0.2, 0.25, 0.3, 0.35),
    shadowRadius: getResponsiveValue(3, 4, 5, 6),
    elevation: getResponsiveValue(3, 4, 5, 6),
    borderWidth: getResponsiveValue(1, 1, 1, 2),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#8B4513',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { 
      width: 0, 
      height: getResponsiveValue(0.5, 1, 1, 1.5) 
    },
    textShadowRadius: getResponsiveValue(1, 2, 2, 3),
  },
});
