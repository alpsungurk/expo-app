import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
  RefreshControl
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useCartStore } from '../store/cartStore';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';
import { parseQRData } from '../utils/qrDecoder';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function QRScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTableNumber, setManualTableNumber] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { setTableInfo, clearTableInfo, tableNumber } = useCartStore();
  const navigation = useNavigation();

  // Animasyon değişkenleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Sayfa açılış animasyonu
  useEffect(() => {
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

  // Kamera ekranı kapatıldığında scanned state'ini reset et
  useEffect(() => {
    if (!showCamera) {
      setScanned(false);
    }
  }, [showCamera]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsLoading(true);

    try {
      // QR kod verisini parse et (URL veya JSON formatında olabilir)
      const parsedData = parseQRData(data);
      
      console.log('QR kod verisi parse edildi:', parsedData);

      let tableData = null;
      let tableError = null;

      // Eğer URL formatında ve masa numarası decode edildiyse
      if (parsedData.isUrl && parsedData.masaNo) {
        // Decode edilmiş masa numarasına göre veritabanından ara
        const { data: table, error: error } = await supabase
          .from(TABLES.MASALAR)
          .select('*')
          .eq('masa_no', parsedData.masaNo)
          .eq('aktif', true)
          .single();

        tableData = table;
        tableError = error;

        // Eğer masa_no ile bulunamadıysa, qr_token ile dene
        if (tableError || !tableData) {
          const { data: tableByToken, error: tokenError } = await supabase
            .from(TABLES.MASALAR)
            .select('*')
            .eq('qr_token', parsedData.qrToken)
            .eq('aktif', true)
            .single();

          if (!tokenError && tableByToken) {
            tableData = tableByToken;
            tableError = null;
          }
        }
      } else {
        // JSON veya string formatında, qr_token ile ara
        const { data: table, error: error } = await supabase
          .from(TABLES.MASALAR)
          .select('*')
          .eq('qr_token', parsedData.qrToken)
          .eq('aktif', true)
          .single();

        tableData = table;
        tableError = error;

        // Eğer qr_token ile bulunamadıysa ve masaNo varsa, masa_no ile dene
        if ((tableError || !tableData) && parsedData.masaNo) {
          const { data: tableByMasaNo, error: masaError } = await supabase
            .from(TABLES.MASALAR)
            .select('*')
            .eq('masa_no', parsedData.masaNo)
            .eq('aktif', true)
            .single();

          if (!masaError && tableByMasaNo) {
            tableData = tableByMasaNo;
            tableError = null;
          }
        }
      }

      if (tableError || !tableData) {
        throw new Error('Masa bulunamadı');
      }

      // Masa bilgilerini store'a kaydet (ID ve numara)
      setTableInfo(tableData.id, tableData.masa_no);
      
      setIsLoading(false); // Loading state'ini kapat
      
      Alert.alert(
        'Masa Bulundu! 🎉',
        `${tableData.masa_no} için menüye yönlendiriliyorsunuz.`,
        [
          {
            text: 'Menüye Git',
            onPress: () => {
              setScanned(false); // QR okuma state'ini reset et
              navigation.navigate('Menü');
            }
          },
 
          {
            text: 'Geri',
            style: 'cancel',
            onPress: () => {
              setScanned(false); // QR okuma state'ini reset et
              setShowCamera(false); // Ana ekrana (kamera açılmadan önceki ekran) dön
            }
          }
        ]
      );

    } catch (error) {
      console.error('QR kod okuma hatası:', error);
      setIsLoading(false);
      setScanned(false);
      
      Alert.alert(
        'Masa Bulunamadı',
        'QR kod okunamadı veya masa bulunamadı. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tekrar Okut',
            onPress: () => {
              setScanned(false);
              // QR okuma state'ini reset et, tekrar okutabilir
            }
          },
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              setShowCamera(false);
            }
          }
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
  };

  const handleQRScanPress = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    if (permission?.granted) {
      setScanned(false); // QR okuma state'ini reset et
      setIsLoading(false); // Loading state'ini resetle
      setShowCamera(true);
    }
  };

  const handleManualTableEntry = () => {
    setManualTableNumber(tableNumber || '');
    setShowManualModal(true);
  };

  const handleManualSubmit = async () => {
    if (manualTableNumber && manualTableNumber.trim()) {
      try {
        // Manuel girilen masa numarasını database'de ara
        const { data: tableData, error } = await supabase
          .from(TABLES.MASALAR)
          .select('*')
          .eq('masa_no', manualTableNumber.trim())
          .eq('aktif', true)
          .single();

        if (error || !tableData) {
          Toast.show({
            type: 'error',
            text1: 'Hata',
            text2: 'Masa bulunamadı. Lütfen geçerli bir masa numarası girin.',
            position: 'top',
            visibilityTime: 4000,
          });
          return;
        }

        setTableInfo(tableData.id, tableData.masa_no);
        setShowManualModal(false);
        Alert.alert(
          'Masa Ayarlandı! 🎉',
          `${tableData.masa_no} için menüye yönlendiriliyorsunuz.`,
          [
            {
              text: 'Menüye Git',
              onPress: () => navigation.navigate('Menü')
            }
          ]
        );
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Hata',
          text2: 'Masa bilgisi alınamadı.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    }
  };

  const handleDeleteTable = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    clearTableInfo();
    setShowDeleteModal(false);
    setScanned(false); // QR okuma state'ini reset et
    setIsLoading(false); // Loading state'ini resetle
    Toast.show({
      type: 'success',
      text1: 'Başarılı',
      text2: 'Masa seçimi kaldırıldı.',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // QRScanScreen'de veri yükleme yok, sadece state'i yenile
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Ana seçenekler ekranı
  if (!showCamera) {
    return (
      <View style={styles.container}>
        <TableHeader 
          onSidebarPress={() => setSidebarVisible(true)}
          onInfoPress={() => navigation.navigate('InfoScreen')}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Animated.View style={[
            styles.mainContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            {/* Hero Section */}
            {tableNumber ? (
              <View style={styles.tableInfoCard}>
                <View style={styles.tableInfoHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.tableInfoTitle}>Masa Seçildi</Text>
                </View>
                <Text style={styles.tableInfoNumber}>{tableNumber}</Text>
                <TouchableOpacity 
                  style={styles.deleteTableButtonMain}
                  onPress={handleDeleteTable}
                  activeOpacity={0.6}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.deleteTableButtonText}>Masa Seçimini Kaldır</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons 
                    name="restaurant" 
                    size={isSmallScreen ? 32 : isMediumScreen ? 36 : 40} 
                    color="#8B4513" 
                  />
                </View>
                <Text style={styles.welcomeTitle}>Sipariş Vermeye Başla</Text>
                <Text style={styles.welcomeSubtitle}>
                  Masa üzerindeki QR kodu tarayarak hızlıca sipariş verebilirsiniz
                </Text>
              </View>
            )}

            {/* QR Code Card */}
            <View style={styles.qrCard}>
              <TouchableOpacity 
                style={styles.qrButtonContainer} 
                onPress={handleQRScanPress}
                disabled={isLoading}
                activeOpacity={0.95}
                android_ripple={{
                  color: 'rgba(139, 69, 19, 0.15)',
                  borderless: false,
                }}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#FAFAFA', '#F5F5F5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.qrButtonGradient}
                >
                  <View style={styles.qrIconWrapper}>
                    <Ionicons 
                      name="qr-code-outline" 
                      size={isSmallScreen ? 36 : isMediumScreen ? 40 : 44} 
                      color="#8B4513" 
                    />
                    <View style={styles.qrIconPulse} />
                  </View>
                  <Text style={styles.qrButtonTitle}>QR Kod Tarayın</Text>
                  <Text style={styles.qrButtonDescription}>
                    Kamerayı açmak için dokunun
                  </Text>
                  <View style={styles.qrButtonArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#8B4513" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.infoCardTitle}>Nasıl Çalışır?</Text>
                </View>
                <Text style={styles.infoCardDescription}>
                  Masanızın üzerindeki QR kodu kameraya doğrultun, masa bilgisi otomatik olarak kaydedilir.
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="flash" size={20} color="#F59E0B" />
                  <Text style={styles.infoCardTitle}>Hızlı ve Kolay</Text>
                </View>
                <Text style={styles.infoCardDescription}>
                  Sadece birkaç saniyede masa seçiminizi tamamlayıp sipariş vermeye başlayabilirsiniz.
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Masa Silme Onay Modal */}
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
                <Text style={styles.deleteModalTitle}>Masa Seçimini Kaldır</Text>
              </View>
              
              <Text style={styles.deleteModalDescription}>
                Seçilen masa bilgisini kaldırmak istediğinizden emin misiniz?
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
                  <Text style={styles.deleteModalConfirmText}>Kaldır</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  // Kamera ekranı
  if (!permission) {
    return (
      <View style={styles.container}>
        <TableHeader 
          onSidebarPress={() => setSidebarVisible(true)}
          onInfoPress={() => navigation.navigate('InfoScreen')}
        />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Kamera izni isteniyor...</Text>
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TableHeader 
          onSidebarPress={() => setSidebarVisible(true)}
          onInfoPress={() => navigation.navigate('InfoScreen')}
        />

        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Kamera Erişimi Gerekli</Text>
          <Text style={styles.permissionDescription}>
            QR kod taramak için kamera iznine ihtiyacımız var
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualButton} onPress={() => {
            setScanned(false); // QR okuma state'ini reset et
            setShowCamera(false);
          }}>
            <Text style={styles.manualButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instruction}>
          Masa üzerindeki QR kodu kameraya doğrultun
        </Text>
        
        <View style={styles.cameraButtons}>
          <TouchableOpacity 
            style={[styles.cameraButton, styles.backButton, styles.backButtonFull]} 
            onPress={() => {
              setScanned(false); // QR okuma state'ini reset et
              setShowCamera(false);
            }}
          >
            <Ionicons name="arrow-back" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="#8B4513" />
            <Text style={[styles.cameraButtonText, styles.backButtonText]}>Geri</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Masa bilgileri alınıyor...</Text>
          </View>
        )}
      </View>

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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mainContainer: {
    flex: 1,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    gap: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  // Welcome Card
  welcomeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    padding: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    marginBottom: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  welcomeIconContainer: {
    width: isSmallScreen ? 56 : isMediumScreen ? 64 : 72,
    height: isSmallScreen ? 56 : isMediumScreen ? 64 : 72,
    borderRadius: isSmallScreen ? 28 : isMediumScreen ? 32 : 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  welcomeSubtitle: {
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontFamily: 'System',
  },
  // Table Info Card
  tableInfoCard: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 14,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 18,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tableInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableInfoTitle: {
    fontSize: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  tableInfoNumber: {
    fontSize: isSmallScreen ? 32 : isMediumScreen ? 36 : 40,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  // QR Card
  qrCard: {
    marginBottom: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    borderRadius: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrButtonContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  qrButtonGradient: {
    padding: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isSmallScreen ? 140 : isMediumScreen ? 150 : 160,
    width: '100%',
  },
  qrIconWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  qrIconPulse: {
    position: 'absolute',
    width: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    height: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    borderRadius: isSmallScreen ? 30 : isMediumScreen ? 35 : 40,
    backgroundColor: 'transparent',
    top: -12,
    left: -12,
  },
  qrButtonTitle: {
    fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  qrButtonDescription: {
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  qrButtonArrow: {
    marginTop: 4,
  },
  // Info Section
  infoSection: {
    gap: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    marginTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    padding: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: isSmallScreen ? 14 : isMediumScreen ? 15 : 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
  },
  infoCardDescription: {
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 15,
    color: '#6B7280',
    lineHeight: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontFamily: 'System',
  },
  optionsContainer: {
    gap: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  qrOptionButton: {
    borderColor: '#8B4513',
  },
  tableOptionButton: {
    borderColor: '#E5E7EB',
  },
  optionIconContainer: {
    width: isLargeScreen ? 80 : isMediumScreen ? 70 : 60,
    height: isLargeScreen ? 80 : isMediumScreen ? 70 : 60,
    borderRadius: isLargeScreen ? 40 : isMediumScreen ? 35 : 30,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  optionIconContainerTable: {
    width: isLargeScreen ? 80 : isMediumScreen ? 70 : 60,
    height: isLargeScreen ? 80 : isMediumScreen ? 70 : 60,
    borderRadius: isLargeScreen ? 40 : isMediumScreen ? 35 : 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  optionTitle: {
    fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  tableOptionTitle: {
    color: '#8B4513',
  },
  optionDescription: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
  },
  tableOptionDescription: {
    color: '#8B4513',
  },
  tableSelectModal: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    width: '95%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  tableList: {
    maxHeight: isLargeScreen ? 400 : isMediumScreen ? 350 : 300,
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  tableListContent: {
    paddingBottom: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
  },
  tableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    padding: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTableItem: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  tableItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableItemText: {
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
  },
  selectedTableItemText: {
    color: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  closeButton: {
    padding: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
    borderRadius: isLargeScreen ? 25 : isMediumScreen ? 20 : 15,
  },
  backButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  backButtonFull: {
    flex: 1,
    width: '100%',
  },
  cameraButtonText: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: 'bold',
    marginLeft: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  backButtonText: {
    color: '#8B4513',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    width: width,
    height: height * 0.6,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#8B4513',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
  },
  instruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteTableButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    paddingVertical: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    borderRadius: isLargeScreen ? 30 : isMediumScreen ? 25 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrButton: {
    backgroundColor: '#8B4513',
  },
  menuButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  actionButtonText: {
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    fontWeight: 'bold',
    marginLeft: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
  },
  menuButtonText: {
    color: '#8B4513',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  rescanText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    marginTop: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  manualButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    borderColor: '#D1D5DB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
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
  // Ana Masa Sil Butonu
  deleteTableButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    paddingVertical: isLargeScreen ? 10 : isMediumScreen ? 9 : 8,
    paddingHorizontal: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    marginTop: 8,
    gap: 6,
  },
  deleteTableButtonText: {
    color: '#EF4444',
    fontSize: isSmallScreen ? 14 : isMediumScreen ? 15 : 16,
    fontWeight: '600',
  },
});
