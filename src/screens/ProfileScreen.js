import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import TableHeader from '../components/TableHeader';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function ProfileScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const stats = [
    { label: 'Gönderiler', value: '128', icon: 'images' },
    { label: 'Takipçi', value: '1.2K', icon: 'people' },
    { label: 'Takip', value: '234', icon: 'person-add' },
  ];

  const menuItems = [
    { id: 1, title: 'Hesap Bilgileri', icon: 'person-circle', color: '#6366f1' },
    { id: 2, title: 'Güvenlik', icon: 'shield-checkmark', color: '#8b5cf6' },
    { id: 3, title: 'Bildirimler', icon: 'notifications', color: '#ec4899' },
    { id: 4, title: 'Gizlilik', icon: 'lock-closed', color: '#14b8a6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={60} color="#6366f1" />
            </View>
          </View>
          
          <Text style={styles.name}>Kullanıcı Adı</Text>
          <Text style={styles.email}>kullanici@email.com</Text>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Ionicons name={stat.icon} size={24} color="#6366f1" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Hesap Yönetimi</Text>
          
          {menuItems.map((item) => (
            <Card key={item.id}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={22} color="white" />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </Card>
          ))}

          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6366f1',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

