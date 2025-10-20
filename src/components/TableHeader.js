import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function TableHeader({ onQRScan, onSidebarPress, pageName }) {
  const { tableNumber, qrToken } = useCartStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={onSidebarPress}
        >
          <Ionicons name="menu" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
        </TouchableOpacity>

        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>☕ Kahve Dükkanı</Text>
          {pageName && (
            <Text style={styles.pageName}>{pageName}</Text>
          )}
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
    paddingTop: 50,
    paddingBottom: 16,
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
    width: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    height: isLargeScreen ? 44 : isMediumScreen ? 40 : 36,
    borderRadius: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  shopInfo: {
    flex: 1,
    alignItems: 'center',
  },
  shopName: {
    fontSize: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  pageName: {
    fontSize: isLargeScreen ? 12 : isMediumScreen ? 11 : 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  tableInfo: {
    fontSize: isLargeScreen ? 16 : isMediumScreen ? 15 : 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
});
