import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
  Switch,
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

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const settingsGroups = [
    {
      title: 'Bildirimler',
      items: [
        { 
          id: 1, 
          title: 'Push Bildirimleri', 
          icon: 'notifications',
          type: 'switch',
          value: pushEnabled,
          onValueChange: setPushEnabled,
          color: '#6366f1'
        },
        { 
          id: 2, 
          title: 'E-posta Bildirimleri', 
          icon: 'mail',
          type: 'switch',
          value: emailEnabled,
          onValueChange: setEmailEnabled,
          color: '#8b5cf6'
        },
      ],
    },
    {
      title: 'Görünüm',
      items: [
        { 
          id: 3, 
          title: 'Karanlık Mod', 
          icon: 'moon',
          type: 'switch',
          value: darkMode,
          onValueChange: setDarkMode,
          color: '#1f2937'
        },
      ],
    },
    {
      title: 'Genel',
      items: [
        { 
          id: 4, 
          title: 'Dil Ayarları', 
          icon: 'language',
          type: 'arrow',
          color: '#ec4899'
        },
        { 
          id: 5, 
          title: 'Önbelleği Temizle', 
          icon: 'trash',
          type: 'arrow',
          color: '#ef4444'
        },
      ],
    },
    {
      title: 'Destek',
      items: [
        { 
          id: 6, 
          title: 'Yardım Merkezi', 
          icon: 'help-circle',
          type: 'arrow',
          color: '#14b8a6'
        },
        { 
          id: 7, 
          title: 'Hakkında', 
          icon: 'information-circle',
          type: 'arrow',
          color: '#06b6d4'
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TableHeader onSidebarPress={() => setSidebarVisible(true)} pageName="Ayarlar" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {settingsGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>

              {group.items.map((item) => (
                <Card key={item.id}>
                  <View style={styles.settingItem}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon} size={22} color="white" />
                    </View>
                    <Text style={styles.settingTitle}>{item.title}</Text>

                    {item.type === 'switch' ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onValueChange}
                        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                        thumbColor={item.value ? '#6366f1' : '#f3f4f6'}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Versiyon 1.0.0</Text>
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
  content: {
    padding: 20,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
  },
});

