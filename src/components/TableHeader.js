import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { useNotification } from '../contexts/NotificationContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function TableHeader({ onQRScan, onSidebarPress, showBackButton = false, onBackPress }) {
  const { tableNumber, qrToken } = useCartStore();
  const { getSistemAyarı } = useAppStore();
  const { showNotifications } = useNotification();
  const insets = useSafeAreaInsets();
  
  const kafeAdi = getSistemAyarı('kafe_adi') || 'Kahve Dükkanı';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.sidebarButton}
            onPress={onBackPress}
          >
            <Ionicons name="arrow-back" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sidebarButton}
            onPress={onSidebarPress}
          >
            <Ionicons name="menu" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
          </TouchableOpacity>
        )}

        <View style={styles.shopInfo}>
          <View style={styles.shopNameContainer}>
            <Ionicons name="cafe" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            <Text style={styles.shopName}>{kafeAdi}</Text>
          </View>
          {tableNumber ? (
            <Text style={styles.tableInfo}>{tableNumber}</Text>
          ) : (
            <Text style={styles.tableInfo}>Masa seçilmedi</Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={showNotifications}
        >
          <Ionicons name="notifications" size={isLargeScreen ? 20 : isMediumScreen ? 18 : 16} color="#8B4513" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8B4513',
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarButton: {
    width: isLargeScreen ? 36 : isMediumScreen ? 34 : 32,
    height: isLargeScreen ? 36 : isMediumScreen ? 34 : 32,
    borderRadius: isLargeScreen ? 18 : isMediumScreen ? 17 : 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  shopNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  shopName: {
    fontSize: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: 'white',
    marginLeft: 6,
    textAlign: 'center',
  },
  tableInfo: {
    fontSize: isLargeScreen ? 15 : isMediumScreen ? 14 : 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  notificationButton: {
    width: isLargeScreen ? 36 : isMediumScreen ? 34 : 32,
    height: isLargeScreen ? 36 : isMediumScreen ? 34 : 32,
    borderRadius: isLargeScreen ? 18 : isMediumScreen ? 17 : 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
