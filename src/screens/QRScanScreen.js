import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal,
  ScrollView,
  Animated
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import TableHeader from '../components/TableHeader';
import SistemAyarlariSidebar from '../components/SistemAyarlariSidebar';

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
  const [showTableSelect, setShowTableSelect] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { setTableInfo, clearTableInfo, tableNumber } = useCartStore();
  const navigation = useNavigation();

  // Animasyon değişkenleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Masaları yükle
  useEffect(() => {
    loadTables();
  }, []);

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

  // Sayfa her açıldığında verileri yenile
  useFocusEffect(
    useCallback(() => {
      loadTables();
    }, [])
  );

  const loadTables = async () => {
    try {
      const { data: tablesData, error } = await supabase
        .from(TABLES.MASALAR)
        .select('id, masa_no')
        .eq('aktif', true)
        .order('masa_no', { ascending: true });

      if (error) {
        console.error('Masalar yüklenirken hata:', error);
        return;
      }

      setTables(tablesData || []);
    } catch (error) {
      console.error('Masalar yüklenirken hata:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsLoading(true);

    try {
      // QR kod verisini parse et
      let qrToken;
      try {
        const qrData = JSON.parse(data);
        qrToken = qrData.qr_token || data;
      } catch {
        // JSON değilse direkt string olarak kabul et (qr_token)
        qrToken = data;
      }

      // Masa bilgilerini veritabanından al (qr_token'a göre)
      const { data: tableData, error: tableError } = await supabase
        .from(TABLES.MASALAR)
        .select('*')
        .eq('qr_token', qrToken)
        .eq('aktif', true)
        .single();

      if (tableError || !tableData) {
        throw new Error('Masa bulunamadı');
      }

      // Masa bilgilerini store'a kaydet (ID ve numara)
      setTableInfo(tableData.id, tableData.masa_no);
      
      Alert.alert(
        'Masa Bulundu! 🎉',
        ` ${tableData.masa_no} için menüye yönlendiriliyorsunuz.`,
        [
          {
            text: 'Menüye Git',
            onPress: () => navigation.navigate('Menü')
          },
          {
            text: 'Sepete Git',
            onPress: () => navigation.navigate('Sepet')
          }
        ]
      );

    } catch (error) {
      console.error('QR kod okuma hatası:', error);
      Alert.alert('Hata', 'QR kod okunamadı veya masa bulunamadı. Lütfen tekrar deneyin.');
      setScanned(false);
    } finally {
      setIsLoading(false);
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
      setShowCamera(true);
    }
  };

  const handleTableSelectPress = () => {
    setShowTableSelect(true);
  };

  const handleTableSelection = (table) => {
    setSelectedTable(table);
  };

  const handleConfirmTableSelection = () => {
    if (selectedTable) {
      setTableInfo(selectedTable.id, selectedTable.masa_no);
      setShowTableSelect(false);
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
          Alert.alert('Hata', 'Masa bulunamadı. Lütfen geçerli bir masa numarası girin.');
          return;
        }

        setTableInfo(tableData.id, tableData.masa_no);
        setShowManualModal(false);
        Alert.alert(
          'Masa Ayarlandı! 🎉',
          `Masa ${tableData.masa_no} için menüye yönlendiriliyorsunuz.`,
          [
            {
              text: 'Menüye Git',
              onPress: () => navigation.navigate('Menü')
            }
          ]
        );
      } catch (error) {
        Alert.alert('Hata', 'Masa bilgisi alınamadı.');
      }
    }
  };

  const handleDeleteTable = () => {
    console.log('Delete table button pressed');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    clearTableInfo();
    setSelectedTable(null);
    setShowDeleteModal(false);
    Alert.alert('Başarılı', 'Masa seçimi kaldırıldı.');
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Ana seçenekler ekranı
  if (!showCamera) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <Animated.View style={[
          styles.mainContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <View style={styles.welcomeContainer}>
            <Ionicons name="restaurant" size={isLargeScreen ? 80 : isMediumScreen ? 70 : 60} color="#8B4513" />
            <Text style={styles.welcomeTitle}>
              {(tableNumber || selectedTable) ? 
                `${selectedTable ? selectedTable.masa_no : tableNumber}` : 
                'Masa Seçimi'
              }
            </Text>
            {(tableNumber || selectedTable) ? (
              <TouchableOpacity 
                style={styles.deleteTableButtonMain}
                onPress={handleDeleteTable}
                activeOpacity={0.6}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={styles.deleteTableButtonText}>Masa Sil</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.welcomeDescription}>
                Sipariş vermek için masa seçimi yapın
              </Text>
            )}
          </View>


          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, styles.qrOptionButton]} 
              onPress={handleQRScanPress}
              disabled={isLoading}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="qr-code" size={isLargeScreen ? 40 : isMediumScreen ? 35 : 30} color="white" />
              </View>
              <Text style={styles.optionTitle}>QR Kod Tarayın</Text>
              <Text style={styles.optionDescription}>
                Masa üzerindeki QR kodu kameraya doğrultun
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.optionButton, styles.tableOptionButton]} 
              onPress={handleTableSelectPress}
              disabled={isLoading}
            >
              <View style={styles.optionIconContainerTable}>
                <Ionicons name="list" size={isLargeScreen ? 40 : isMediumScreen ? 35 : 30} color="#8B4513" />
              </View>
              <Text style={[styles.optionTitle, styles.tableOptionTitle]}>Masa Seçin</Text>
              <Text style={[styles.optionDescription, styles.tableOptionDescription]}>
                Masa numarasını manuel olarak girin
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Masa Seçimi Modal */}
        <Modal
          visible={showTableSelect}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTableSelect(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.tableSelectModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Masa Seçimi</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowTableSelect(false)}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                Lütfen masanızı seçin:
              </Text>
              
              <ScrollView 
                style={styles.tableList}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.tableListContent}
              >
                {tables.map((table) => (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableItem,
                      selectedTable?.id === table.id && styles.selectedTableItem
                    ]}
                    onPress={() => handleTableSelection(table)}
                  >
                    <View style={styles.tableItemContent}>
                      <Ionicons 
                        name="restaurant" 
                        size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} 
                        color={selectedTable?.id === table.id ? "white" : "#8B4513"} 
                      />
                      <Text style={[
                        styles.tableItemText,
                        selectedTable?.id === table.id && styles.selectedTableItemText
                      ]}>
                        {table.masa_no}
                      </Text>
                    </View>
                    {selectedTable?.id === table.id && (
                      <Ionicons name="checkmark-circle" size={24} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowTableSelect(false)}
                >
                  <Text style={styles.modalCancelText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    !selectedTable && styles.disabledButton
                  ]}
                  onPress={handleConfirmTableSelection}
                  disabled={!selectedTable}
                >
                  <Text style={[
                    styles.modalSubmitText,
                    !selectedTable && styles.disabledButtonText
                  ]}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
      </SafeAreaView>
    );
  }

  // Kamera ekranı
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Kamera izni isteniyor...</Text>
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Kamera Erişimi Gerekli</Text>
          <Text style={styles.permissionDescription}>
            QR kod taramak için kamera iznine ihtiyacımız var
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualButton} onPress={() => setShowCamera(false)}>
            <Text style={styles.manualButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>

        <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        
        {tableNumber && (
          <View style={styles.currentTableContainer}>
            <View style={styles.currentTableInfo}>
              <Ionicons name="restaurant" size={16} color="#8B4513" />
              <Text style={styles.currentTableText}>
                 {tableNumber}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteTableButton}
              onPress={handleDeleteTable}
              activeOpacity={0.6}
            >
              <Ionicons name="close-circle" size={26} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.cameraButtons}>
          <TouchableOpacity 
            style={[styles.cameraButton, styles.backButton]} 
            onPress={() => setShowCamera(false)}
          >
            <Ionicons name="arrow-back" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="#8B4513" />
            <Text style={[styles.cameraButtonText, styles.backButtonText]}>Geri</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cameraButton, styles.rescanButton]} 
            onPress={resetScanner}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            <Text style={styles.cameraButtonText}>Tekrar Tara</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Masa bilgileri alınıyor...</Text>
          </View>
        )}
      </View>

      <SistemAyarlariSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainContainer: {
    flex: 1,
    padding: isLargeScreen ? 24 : isMediumScreen ? 20 : 16,
    justifyContent: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: isLargeScreen ? 40 : isMediumScreen ? 32 : 24,
  },
  welcomeTitle: {
    fontSize: isLargeScreen ? 28 : isMediumScreen ? 24 : 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    marginBottom: isLargeScreen ? 12 : isMediumScreen ? 8 : 6,
  },
  welcomeDescription: {
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 28 : isMediumScreen ? 24 : 20,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
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
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    paddingVertical: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    paddingHorizontal: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    marginTop: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  deleteTableButtonText: {
    color: '#EF4444',
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    fontWeight: '600',
    marginLeft: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
});
