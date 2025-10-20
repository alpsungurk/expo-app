import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';
import { useNavigation } from '@react-navigation/native';
import { supabase, TABLES } from '../config/supabase';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

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
  const { setTableInfo, tableNumber } = useCartStore();
  const navigation = useNavigation();

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsLoading(true);

    try {
      // QR kod verisini parse et
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        // JSON değilse direkt string olarak kabul et
        qrData = { qr_token: data };
      }

      // Masa bilgilerini veritabanından al
      const { data: tableData, error: tableError } = await supabase
        .from(TABLES.MASALAR)
        .select('*')
        .eq('qr_token', qrData.qr_token || data)
        .eq('aktif', true)
        .single();

      if (tableError || !tableData) {
        throw new Error('Masa bulunamadı');
      }

      // Masa bilgilerini store'a kaydet
      setTableInfo(tableData.masa_no, tableData.qr_token);
      
      Alert.alert(
        'Masa Bulundu! 🎉',
        `Masa ${tableData.masa_no} için menüye yönlendiriliyorsunuz.`,
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

  const handleManualTableEntry = () => {
    setManualTableNumber(tableNumber || '');
    setShowManualModal(true);
  };

  const handleManualSubmit = () => {
    if (manualTableNumber && manualTableNumber.trim()) {
      setTableInfo(manualTableNumber.trim(), `manual-${manualTableNumber.trim()}`);
      setShowManualModal(false);
      Alert.alert(
        'Masa Ayarlandı! 🎉',
        `Masa ${manualTableNumber} için menüye yönlendiriliyorsunuz.`,
        [
          {
            text: 'Menüye Git',
            onPress: () => navigation.navigate('Menü')
          }
        ]
      );
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Kamera izni isteniyor...</Text>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
          <TouchableOpacity style={styles.manualButton} onPress={handleManualTableEntry}>
            <Text style={styles.manualButtonText}>Manuel Masa Girişi</Text>
          </TouchableOpacity>
        </View>

        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
            <Ionicons name="restaurant" size={16} color="#8B4513" />
            <Text style={styles.currentTableText}>
              Mevcut Masa: {tableNumber}
            </Text>
          </View>
        )}
        
        {scanned && (
          <TouchableOpacity style={styles.rescanButton} onPress={resetScanner}>
            <Ionicons name="refresh" size={20} color="#8B4513" />
            <Text style={styles.rescanText}>Tekrar Tara</Text>
          </TouchableOpacity>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Masa bilgileri alınıyor...</Text>
          </View>
        )}
      </View>

      {/* Manuel Masa Girişi Modal */}
      <Modal
        visible={showManualModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Masa Numarası</Text>
            <Text style={styles.modalDescription}>
              Lütfen masa numaranızı girin:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={manualTableNumber}
              onChangeText={setManualTableNumber}
              placeholder="Örn: 5"
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleManualSubmit}
              >
                <Text style={styles.modalSubmitText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  currentTableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  currentTableText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
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
});
