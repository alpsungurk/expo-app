import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, TABLES } from '../config/supabase';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function AnnouncementsScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

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
  }, []);


  const loadData = async () => {
    try {
      const now = new Date();
      const nowISOString = now.toISOString();


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

     

      // Yeni önerileri yükle (sadece aktif olanlar - tarih filtrelemesi client tarafında yapılacak)
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from(TABLES.YENI_ONERILER)
        .select('*')
        .eq('aktif', true)
        .order('id', { ascending: true });

      if (suggestionsError) throw suggestionsError;

     


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

  const renderCampaign = (campaign) => {
    // Resim URL'sini kontrol et
    const getImageUri = () => {
      const STORAGE_BUCKET = 'images';
      let raw = (
        campaign.resim_path ||
        campaign.image_url ||
        campaign.resimUrl ||
        campaign.banner_url ||
        campaign.gorsel_url ||
        campaign.image
      );
      
      if (!raw) return null;
      if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
      // Build public URL via Supabase Storage for path-only values
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(raw);
      return data?.publicUrl || null;
    };

    const imageUri = getImageUri();

    return (
      <TouchableOpacity 
        key={campaign.id}
        style={styles.campaignCard} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AnnouncementDetail', { announcement: { ...campaign, tur: 'kampanya' } })}
      >
        <View style={styles.campaignImageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.campaignImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.campaignImagePlaceholder}>
              <Ionicons name="gift" size={isSmallScreen ? 24 : isMediumScreen ? 28 : 32} color="white" />
            </View>
          )}
        </View>

      {/* Sağ taraf - İçerik */}
      <View style={styles.campaignContentContainer}>
        <View style={styles.campaignHeader}>
          <Text style={styles.campaignTitle}>{campaign.ad}</Text>
          <View style={styles.campaignBadge}>
            <Text style={styles.campaignBadgeText}>Kampanya</Text>
          </View>
        </View>
        
        <Text style={styles.campaignDescription}>
          {campaign.aciklama || campaign.kampanya_aciklama || 'Kampanya detayları'}
        </Text>
        
        <View style={styles.campaignFooter}>
          <View style={styles.campaignDate}>
            <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.campaignDateText}>
              {formatDate(campaign.baslangic_tarihi)}
              {campaign.bitis_tarihi ? ` - ${formatDate(campaign.bitis_tarihi)}` : ' (Devam Ediyor)'}
            </Text>
          </View>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

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
      badgeText = 'Duyuru';
      badgeColor = '#FEF3C7';
      badgeTextColor = '#8B4513';
    } else if (isOngoing) {
      badgeText = 'Sürekli';
      badgeColor = '#E0E7FF';
      badgeTextColor = '#3730A3';
    } else if (isHistorical) {
      badgeText = 'Duyuru';
      badgeColor = '#FEF3C7';
      badgeTextColor = '#8B4513';
    }

    // Resim URL'sini kontrol et
    const getImageUri = () => {
      const STORAGE_BUCKET = 'images';
      let raw = (
        announcement.resim_path ||
        announcement.image_url ||
        announcement.resimUrl ||
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

    return (
      <TouchableOpacity 
        key={announcement.id}
        style={styles.announcementCard}
        onPress={() => navigation.navigate('AnnouncementDetail', { announcement: { ...announcement, tur: 'duyuru' } })}
        activeOpacity={0.7}
      >
        {/* Sol taraf - Fotoğraf */}
        <View style={styles.announcementImageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.announcementImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.announcementImagePlaceholder}>
              <Ionicons name="megaphone" size={isSmallScreen ? 24 : isMediumScreen ? 28 : 32} color="#8B4513" />
            </View>
          )}
        </View>

        {/* Sağ taraf - İçerik */}
        <View style={styles.announcementContentContainer}>
          <View style={styles.announcementHeader}>
            <Text style={styles.announcementTitle}>{announcement.baslik}</Text>
            <View style={[styles.announcementBadge, {backgroundColor: badgeColor}]}>
              <Text style={[styles.announcementBadgeText, {color: badgeTextColor}]}>{badgeText}</Text>
            </View>
          </View>
          
          <Text style={styles.announcementContent}>
            {announcement.icerik || announcement.duyuru_aciklama || 'Duyuru detayları'}
          </Text>

          <View style={styles.announcementFooter}>
            <View style={styles.announcementDate}>
              <Ionicons name="time" size={12} color="#9CA3AF" />
              <Text style={styles.announcementDateText}>
                {formatDate(announcement.baslangic_tarihi)}
                {announcement.bitis_tarihi ? ` - ${formatDate(announcement.bitis_tarihi)}` : ' (Devam Ediyor)'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const activeCampaigns = getActiveCampaigns();
  const activeAnnouncements = getActiveAnnouncements();
  
  // İlk 4'ü göster, daha fazlası varsa "Daha Fazla Yükle" butonu ekle
  const displayedCampaigns = showAllCampaigns ? activeCampaigns : activeCampaigns.slice(0, 4);
  const displayedAnnouncements = showAllAnnouncements ? activeAnnouncements : activeAnnouncements.slice(0, 4);
  
  const hasMoreCampaigns = activeCampaigns.length > 4;
  const hasMoreAnnouncements = activeAnnouncements.length > 4;


  return (
    <View style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Kampanyalar */}
        {activeCampaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift" size={20} color="#8B4513" />
              <Text style={styles.sectionTitle}>Aktif Kampanyalar</Text>
            </View>
            {displayedCampaigns.map(renderCampaign)}
            
            {/* Daha Fazla Kampanya Butonu */}
            {hasMoreCampaigns && !showAllCampaigns && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={() => setShowAllCampaigns(true)}
              >
                <Text style={styles.loadMoreButtonText}>
                  Tüm Kampanyaları Gör ({activeCampaigns.length - 4} daha)
                </Text>
                <Ionicons name="chevron-down" size={16} color="#8B4513" />
              </TouchableOpacity>
            )}
            
            {/* Daha Az Göster Butonu */}
            {hasMoreCampaigns && showAllCampaigns && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={() => setShowAllCampaigns(false)}
              >
                <Text style={styles.loadMoreButtonText}>
                  Daha Az Göster
                </Text>
                <Ionicons name="chevron-up" size={16} color="#8B4513" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Duyurular */}
        {activeAnnouncements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone" size={20} color="#8B4513" />
              <Text style={styles.sectionTitle}>Duyurular</Text>
            </View>
            {displayedAnnouncements.map(renderAnnouncement)}
            
            {/* Daha Fazla Duyuru Butonu */}
            {hasMoreAnnouncements && !showAllAnnouncements && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={() => setShowAllAnnouncements(true)}
              >
                <Text style={styles.loadMoreButtonText}>
                  Tüm Duyuruları Gör ({activeAnnouncements.length - 4} daha)
                </Text>
                <Ionicons name="chevron-down" size={16} color="#8B4513" />
              </TouchableOpacity>
            )}
            
            {/* Daha Az Göster Butonu */}
            {hasMoreAnnouncements && showAllAnnouncements && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={() => setShowAllAnnouncements(false)}
              >
                <Text style={styles.loadMoreButtonText}>
                  Daha Az Göster
                </Text>
                <Ionicons name="chevron-up" size={16} color="#8B4513" />
              </TouchableOpacity>
            )}
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
      </ScrollView>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
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
    marginTop: isSmallScreen ? 16 : 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 12 : 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: isSmallScreen ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  campaignCard: {
    marginHorizontal: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 10 : 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: isSmallScreen ? 3 : 4,
    elevation: 3,
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    padding: isSmallScreen ? 14 : 16,
  },
  campaignImageContainer: {
    width: isSmallScreen ? 80 : 90,
    height: isSmallScreen ? 80 : 90,
    marginRight: isSmallScreen ? 12 : 16,
  },
  campaignImage: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 8 : 10,
  },
  campaignImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: isSmallScreen ? 8 : 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignContentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 8 : 10,
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
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: 'white',
    flex: 1,
    marginRight: 8,
  },
  campaignDescription: {
    fontSize: isSmallScreen ? 12 : 13,
    fontFamily: 'System',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: isSmallScreen ? 16 : 18,
    marginBottom: isSmallScreen ? 8 : 10,
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
    flexDirection: 'row',
  },
  announcementImageContainer: {
    width: isSmallScreen ? 80 : 90,
    height: isSmallScreen ? 80 : 90,
    marginRight: isSmallScreen ? 12 : 16,
  },
  announcementImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEF3C7',
    borderRadius: isSmallScreen ? 8 : 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementImage: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 8 : 10,
  },
  announcementContentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 8 : 10,
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
    fontFamily: 'System',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  announcementContent: {
    fontSize: isSmallScreen ? 12 : 13,
    fontFamily: 'System',
    color: '#6B7280',
    lineHeight: isSmallScreen ? 16 : 18,
    marginBottom: isSmallScreen ? 8 : 10,
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
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: isSmallScreen ? 16 : 20,
    marginTop: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    borderRadius: isSmallScreen ? 8 : 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreButtonText: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#8B4513',
    marginRight: isSmallScreen ? 6 : 8,
    fontFamily: 'System',
  },
});
