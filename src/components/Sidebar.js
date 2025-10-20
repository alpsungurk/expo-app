import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function Sidebar({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[
          styles.sidebar,
          {
            width: isLargeScreen ? width * 0.7 : isMediumScreen ? width * 0.8 : width * 0.9
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
            onPress={onClose}
          >
            <Ionicons name="close" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
          </TouchableOpacity>

          <Text style={[
            styles.sidebarTitle,
            { fontSize: isLargeScreen ? 30 : isMediumScreen ? 26 : 24 }
          ]}>Menü</Text>

          <TouchableOpacity style={[
            styles.sidebarItem,
            {
              paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
              marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
            }
          ]}>
            <Ionicons name="home" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            <Text style={[
              styles.sidebarItemText,
              {
                fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              }
            ]}>Ana Sayfa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[
            styles.sidebarItem,
            {
              paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
              marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
            }
          ]}>
            <Ionicons name="gift" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            <Text style={[
              styles.sidebarItemText,
              {
                fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              }
            ]}>Kampanyalar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[
            styles.sidebarItem,
            {
              paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
              marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
            }
          ]}>
            <Ionicons name="megaphone" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            <Text style={[
              styles.sidebarItemText,
              {
                fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              }
            ]}>Duyurular</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[
            styles.sidebarItem,
            {
              paddingVertical: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              paddingHorizontal: isLargeScreen ? 25 : isMediumScreen ? 22 : 20,
              marginBottom: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
              borderRadius: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
            }
          ]}>
            <Ionicons name="settings" size={isLargeScreen ? 22 : isMediumScreen ? 20 : 18} color="#8B4513" />
            <Text style={[
              styles.sidebarItemText,
              {
                fontSize: isLargeScreen ? 19 : isMediumScreen ? 17 : 16,
                marginLeft: isLargeScreen ? 20 : isMediumScreen ? 18 : 15,
              }
            ]}>Ayarlar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
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
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 30 : isMediumScreen ? 25 : 22,
  },
  sidebarTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isLargeScreen ? 40 : isMediumScreen ? 35 : 30,
    textAlign: 'center',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
  },
  sidebarItemText: {
    color: '#8B4513',
    fontWeight: '600',
  },
});
