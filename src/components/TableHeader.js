import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function TableHeader({ onQRScan, onSidebarPress }) {
  const { tableNumber, qrToken } = useCartStore();
  const { getSistemAyarı } = useAppStore();
  
  const kafeAdi = getSistemAyarı('kafe_adi') || 'Kahve Dükkanı';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={onSidebarPress}
        >
          <Ionicons name="menu" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="#8B4513" />
        </TouchableOpacity>

        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>☕ {kafeAdi}</Text>
          {tableNumber ? (
            <Text style={styles.tableInfo}>Masa {tableNumber}</Text>
          ) : (
            <Text style={styles.tableInfo}>Masa seçilmedi</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8B4513',
    paddingTop: 35,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarButton: {
    width: isLargeScreen ? 42 : isMediumScreen ? 38 : 36,
    height: isLargeScreen ? 42 : isMediumScreen ? 38 : 36,
    borderRadius: isLargeScreen ? 21 : isMediumScreen ? 19 : 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shopInfo: {
    flex: 1,
    alignItems: 'center',
  },
  shopName: {
    fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: 'white',
    marginBottom: 1,
    textAlign: 'center',
  },
  tableInfo: {
    fontSize: isLargeScreen ? 12 : isMediumScreen ? 11 : 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    fontFamily: 'System',
    textAlign: 'center',
  },
});
