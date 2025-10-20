import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, TABLES } from '../config/supabase';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function AnnouncementsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const { 
    campaigns, 
    announcements, 
    getActiveCampaigns, 
    getActiveAnnouncements,
    setCampaigns,
    setAnnouncements,
    setYeniOneriler
  } = useAppStore();

  useEffect(() => {
    loadData();

    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const nowISOString = now.toISOString();

      console.log('Şu anki tarih:', nowISOString);

      // Kampanyaları yükle (sadece aktif olanlar - tarih filtrelemesi client tarafında yapılacak)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from(TABLES.KAMPANYALAR)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (campaignsError) throw campaignsError;

      // Duyuruları yükle (sadece aktif olanlar - tarih filtrelemesi client tarafında yapılacak)
      const { data: announcementsData, error: announcementsError } = await supabase
        .from(TABLES.DUYURULAR)
        .select('*')
        .eq('aktif', true)
        .order('oncelik', { ascending: false })
        .order('id', { ascending: true });

      if (announcementsError) throw announcementsError;

      // Debug: Tüm duyuruları kontrol et (aktif/passif)
      const { data: allAnnouncements, error: allError } = await supabase
        .from(TABLES.DUYURULAR)
        .select('*')
        .order('id', { ascending: true });

      console.log('Tüm duyurular:', allAnnouncements?.map(a => ({
        id: a.id,
        baslik: a.baslik,
        aktif: a.aktif,
        startDate: a.baslangic_tarihi,
        endDate: a.bitis_tarihi
      })));

      // Yeni önerileri yükle (sadece aktif olanlar - tarih filtrelemesi client tarafında yapılacak)
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from(TABLES.YENI_ONERILER)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (suggestionsError) throw suggestionsError;

      console.log('Veritabanından gelen ham veri:', {
        campaigns: campaignsData?.length || 0,
        announcements: announcementsData?.length || 0,
        suggestions: suggestionsData?.length || 0
      });

      setCampaigns(campaignsData || []);
      setAnnouncements(announcementsData || []);
      setYeniOneriler(suggestionsData || []);

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      console.error('Hata detayları:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');

      // Boş verilerle devam et
      setCampaigns([]);
      setAnnouncements([]);
      setYeniOneriler([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const renderCampaign = (campaign) => (
    <TouchableOpacity key={campaign.id} style={styles.campaignCard} activeOpacity={0.8}>
      <LinearGradient
        colors={['#8B4513', '#A0522D']}
        style={styles.campaignGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.campaignContent}>
          <View style={styles.campaignHeader}>
            <View style={styles.campaignIcon}>
              <Ionicons name="gift" size={24} color="white" />
            </View>
            <View style={styles.campaignBadge}>
              <Text style={styles.campaignBadgeText}>Kampanya</Text>
            </View>
          </View>
          
          <Text style={styles.campaignTitle}>{campaign.ad}</Text>
          <Text style={styles.campaignDescription}>{campaign.aciklama}</Text>
          
          <View style={styles.campaignFooter}>
            <View style={styles.campaignDate}>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.campaignDateText}>
                {formatDate(campaign.baslangic_tarihi)}
                {campaign.bitis_tarihi ? ` - ${formatDate(campaign.bitis_tarihi)}` : ' (Devam Ediyor)'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAnnouncement = (announcement) => {
    const now = new Date();
    const startDate = new Date(announcement.baslangic_tarihi);
    const endDate = announcement.bitis_tarihi ? new Date(announcement.bitis_tarihi) : null;

    const isCurrentlyActive = startDate <= now && (!endDate || endDate >= now);
    const isOngoing = !endDate;
    const isHistorical = endDate && endDate < now && startDate <= now;

    let badgeText = 'Duyuru';
    let badgeColor = '#FEF3C7';
    let badgeTextColor = '#8B4513';

    if (isCurrentlyActive) {
      badgeText = 'Aktif';
      badgeColor = '#DCFCE7';
      badgeTextColor = '#166534';
    } else if (isOngoing) {
      badgeText = 'Sürekli';
      badgeColor = '#E0E7FF';
      badgeTextColor = '#3730A3';
    } else if (isHistorical) {
      badgeText = 'Geçmiş';
      badgeColor = '#FEF3C7';
      badgeTextColor = '#8B4513';
    }

    return (
      <View key={announcement.id} style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <View style={styles.announcementIcon}>
            <Ionicons name="megaphone" size={20} color="#8B4513" />
          </View>
          <View style={[styles.announcementBadge, {backgroundColor: badgeColor}]}>
            <Text style={[styles.announcementBadgeText, {color: badgeTextColor}]}>{badgeText}</Text>
          </View>
        </View>

        <Text style={styles.announcementTitle}>{announcement.baslik}</Text>
        <Text style={styles.announcementContent}>{announcement.icerik}</Text>

        <View style={styles.announcementFooter}>
          <View style={styles.announcementDate}>
            <Ionicons name="time" size={14} color="#9CA3AF" />
            <Text style={styles.announcementDateText}>
              {formatDate(announcement.baslangic_tarihi)}
              {announcement.bitis_tarihi ? ` - ${formatDate(announcement.bitis_tarihi)}` : ' (Devam Ediyor)'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const activeCampaigns = getActiveCampaigns();
  const activeAnnouncements = getActiveAnnouncements();

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} pageName="Duyurular" />

      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Kampanyalar */}
        {activeCampaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift" size={20} color="#8B4513" />
              <Text style={styles.sectionTitle}>Aktif Kampanyalar</Text>
            </View>
            {activeCampaigns.map(renderCampaign)}
          </View>
        )}

        {/* Duyurular */}
        {activeAnnouncements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone" size={20} color="#8B4513" />
              <Text style={styles.sectionTitle}>Duyurular</Text>
            </View>
            {activeAnnouncements.map(renderAnnouncement)}
          </View>
        )}

        {/* Boş Durum */}
        {activeCampaigns.length === 0 && activeAnnouncements.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={isSmallScreen ? 60 : 80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Henüz Duyuru Yok</Text>
            <Text style={styles.emptyDescription}>
              Yeni kampanya ve duyurular için takipte kalın
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: isSmallScreen ? 20 : 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 12 : 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  campaignCard: {
    marginHorizontal: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 12 : 16,
    borderRadius: isSmallScreen ? 12 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: isSmallScreen ? 6 : 8,
    elevation: 5,
  },
  campaignGradient: {
    padding: isSmallScreen ? 16 : 20,
  },
  campaignContent: {
    flex: 1,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  campaignIcon: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: isSmallScreen ? 8 : 12,
  },
  campaignBadgeText: {
    color: 'white',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: 'bold',
  },
  campaignTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  campaignDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: isSmallScreen ? 18 : 20,
    marginBottom: isSmallScreen ? 10 : 12,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignDateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: isSmallScreen ? 11 : 12,
    marginLeft: 4,
  },
  announcementCard: {
    backgroundColor: 'white',
    marginHorizontal: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 14 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: isSmallScreen ? 3 : 4,
    elevation: 3,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  announcementIcon: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: isSmallScreen ? 6 : 8,
    paddingVertical: isSmallScreen ? 3 : 4,
    borderRadius: isSmallScreen ? 6 : 8,
  },
  announcementBadgeText: {
    color: '#8B4513',
    fontSize: isSmallScreen ? 9 : 10,
    fontWeight: 'bold',
  },
  announcementTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  announcementContent: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#6B7280',
    lineHeight: isSmallScreen ? 18 : 20,
    marginBottom: isSmallScreen ? 10 : 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  announcementDateText: {
    color: '#9CA3AF',
    fontSize: isSmallScreen ? 11 : 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallScreen ? 30 : 40,
  },
  emptyTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 6 : 8,
  },
  emptyDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 20 : 24,
  },
});
