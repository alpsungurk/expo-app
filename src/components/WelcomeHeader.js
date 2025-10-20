import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba! 👋</Text>
          <Text style={styles.subtitle}>Uygulamaya Hoş Geldiniz</Text>
        </View>
        <View style={styles.notificationIcon}>
          <Ionicons name="notifications-outline" size={24} color="#6366f1" />
          <View style={styles.badge} />
        </View>
      </View>
      
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerIcon}>
            <Ionicons name="rocket" size={32} color="#6366f1" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Yeni Başlangıç</Text>
            <Text style={styles.bannerDescription}>
              Modern ve kullanışlı bir deneyim için hazırız
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  notificationIcon: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: 'white',
  },
  banner: {
    marginHorizontal: 20,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    padding: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
});

