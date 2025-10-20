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

// Daha küçük bar için - responsive breakpoints
const getBarWidth = () => {
  if (isLargeScreen) return width * 0.5; // Tablet daha küçük bar - %50
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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const { campaigns, announcements, getActiveCampaigns, getActiveAnnouncements, yeniOneriler, getActiveYeniOneriler } = useAppStore();

  const activeCampaigns = getActiveCampaigns();
  const activeAnnouncements = getActiveAnnouncements();
  const activeYeniOneriler = getActiveYeniOneriler();

  // Sadece aktif öğeleri al, öncelik sırasına göre
  const allItems = [
    ...activeCampaigns.map(campaign => ({ ...campaign, type: 'campaign' })),
    ...activeAnnouncements.map(announcement => ({ ...announcement, type: 'announcement' })),
    ...activeYeniOneriler.map(o => ({ ...o, type: 'suggestion' }))
  ].sort((a, b) => (b.oncelik || 0) - (a.oncelik || 0));

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
      const raw = (
        item.resim_path ||
        item.image_url ||
        item.resimUrl ||
        item.banner_url ||
        item.gorsel_url ||
        item.image
      );
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
      if (isSuggestion) return item.baslik;
      return item.ad || item.baslik;
    };

    const getDescription = () => {
      if (isCampaign) return item.aciklama;
      if (isAnnouncement) return item.icerik;
      if (isSuggestion) return item.aciklama;
      return item.aciklama || item.icerik;
    };

    return (
      <View key={`${item.type}-${item.id}`} style={styles.slideContainer}>
        <TouchableOpacity
          style={[
            styles.card,
            {
              width: isLargeScreen ? width * 0.9 : isMediumScreen ? width * 0.85 : width * 0.8 // Büyük ekranlarda daha büyük kartlar
            }
          ]}
          activeOpacity={0.9}
        >
          {/* If there is an image, render it and apply a subtle dark gradient overlay */}
          <LinearGradient
            colors={getImageUri() ? ['rgba(0,0,0,0.20)','rgba(0,0,0,0.55)'] : getGradientColors()}
            style={[
              styles.gradient,
              {
                minHeight: isLargeScreen ? 200 : isMediumScreen ? 160 : 140
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
                    width: isLargeScreen ? 70 : isMediumScreen ? 55 : 50,
                    height: isLargeScreen ? 70 : isMediumScreen ? 55 : 50,
                    borderRadius: isLargeScreen ? 35 : isMediumScreen ? 27 : 25,
                  }
                ]}>
                  <Ionicons
                    name={getIcon()}
                    size={isLargeScreen ? 36 : isMediumScreen ? 28 : 26}
                    color="white"
                  />
                </View>

                <View style={[
                  styles.badge,
                  {
                    paddingHorizontal: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                    paddingVertical: isLargeScreen ? 8 : isMediumScreen ? 7 : 6,
                    borderRadius: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                  }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12 }
                  ]}>
                    {getBadgeText()}
                  </Text>
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={[
                  styles.title,
                  {
                    fontSize: isLargeScreen ? 26 : isMediumScreen ? 22 : 20,
                    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
                    lineHeight: isLargeScreen ? 30 : isMediumScreen ? 26 : 22,
                  }
                ]} numberOfLines={2}>
                  {getTitle()}
                </Text>
                <Text style={[
                  styles.description,
                  {
                    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
                    lineHeight: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
                  }
                ]} numberOfLines={3}>
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
      {/* Küçük, ortalanmış bar */}
      <View style={styles.headerBar}>
        <View style={styles.barContent}>
          <Text style={[styles.headerTitle, { fontSize: isLargeScreen ? 18 : isMediumScreen ? 17 : 15 }]}>
            Kampanyalar & Duyurular
          </Text>
        </View>
      </View>

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
        style={styles.scrollView}
      >
        {allItems.map((item, index) => renderItem(item, index))}
      </ScrollView>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <View style={[
            styles.sidebar,
            {
              width: isLargeScreen ? width * 0.7 : isMediumScreen ? width * 0.8 : width * 0.9 // Daha geniş sidebar
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  width: isLargeScreen ? 45 : isMediumScreen ? 42 : 40,
                  height: isLargeScreen ? 45 : isMediumScreen ? 42 : 40,
                  borderRadius: isLargeScreen ? 22 : isMediumScreen ? 21 : 20,
                }
              ]}
              onPress={() => setSidebarVisible(false)}
            >
              <Ionicons name="close" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            </TouchableOpacity>

            <Text style={[
              styles.sidebarTitle,
              { fontSize: isLargeScreen ? 26 : isMediumScreen ? 24 : 22 }
            ]}>Menü</Text>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
                marginBottom: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
                borderRadius: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
              }
            ]}>
              <Ionicons name="home" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 17 : isMediumScreen ? 16 : 15,
                  marginLeft: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                }
              ]}>Ana Sayfa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
                marginBottom: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
                borderRadius: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
              }
            ]}>
              <Ionicons name="gift" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 17 : isMediumScreen ? 16 : 15,
                  marginLeft: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                }
              ]}>Kampanyalar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
                marginBottom: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
                borderRadius: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
              }
            ]}>
              <Ionicons name="megaphone" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 17 : isMediumScreen ? 16 : 15,
                  marginLeft: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                }
              ]}>Duyurular</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
              styles.sidebarItem,
              {
                paddingVertical: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
                marginBottom: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
                borderRadius: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
              }
            ]}>
              <Ionicons name="settings" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
              <Text style={[
                styles.sidebarItemText,
                {
                  fontSize: isLargeScreen ? 17 : isMediumScreen ? 16 : 15,
                  marginLeft: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
                }
              ]}>Ayarlar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
  },
  // Responsive header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    paddingVertical: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    marginHorizontal: isLargeScreen ? 40 : isMediumScreen ? 30 : 20,
    marginBottom: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
  },
  sidebarButton: {
    width: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    height: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    borderRadius: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  barContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
    height: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
    borderRadius: isLargeScreen ? 5 : isMediumScreen ? 4 : 3,
    backgroundColor: 'rgba(139, 69, 19, 0.3)',
    marginHorizontal: isLargeScreen ? 4 : isMediumScreen ? 3 : 2,
  },
  activeDot: {
    backgroundColor: '#8B4513',
    transform: [{ scaleX: isLargeScreen ? 2 : isMediumScreen ? 1.8 : 1.5 }],
  },
  moreDots: {
    fontSize: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    height: isLargeScreen ? 220 : isMediumScreen ? 180 : 160,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slideContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    elevation: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
  },
  gradient: {
    padding: isLargeScreen ? 30 : isMediumScreen ? 24 : 20,
    width: '100%',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 14,
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
  },
  title: {
    fontWeight: 'bold',
    color: 'white',
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
    color: 'white',
  },
  // Responsive sidebar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: isLargeScreen ? width * 0.6 : isMediumScreen ? width * 0.7 : width * 0.8,
    height: '100%',
    backgroundColor: 'white',
    padding: isLargeScreen ? 35 : isMediumScreen ? 30 : 25,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: isLargeScreen ? 50 : isMediumScreen ? 45 : 40,
    height: isLargeScreen ? 50 : isMediumScreen ? 45 : 40,
    borderRadius: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 30 : isMediumScreen ? 25 : 22,
  },
  sidebarTitle: {
    fontSize: isLargeScreen ? 30 : isMediumScreen ? 26 : 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 40 : isMediumScreen ? 35 : 30,
    textAlign: 'center',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
    paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
    marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
  },
  sidebarItemText: {
    fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
  },
});
