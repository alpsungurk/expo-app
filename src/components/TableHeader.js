import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback, Animated, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { useNotification } from '../contexts/NotificationContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

// Animasyonlu Buton Component
const AnimatedButton = ({ onPress, children, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnimationRef = useRef(null);
  const opacityAnimationRef = useRef(null);

  const handlePressIn = () => {
    // Önceki animasyonları durdur
    if (scaleAnimationRef.current) {
      scaleAnimationRef.current.stop();
    }
    if (opacityAnimationRef.current) {
      opacityAnimationRef.current.stop();
    }
    
    // Animasyonları hemen başlat (daha hızlı ve daha belirgin)
    scaleAnimationRef.current = Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 500,
      friction: 7,
    });
    
    opacityAnimationRef.current = Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    });
    
    scaleAnimationRef.current.start();
    opacityAnimationRef.current.start();
  };

  const handlePressOut = () => {
    // Önceki animasyonları durdur
    if (scaleAnimationRef.current) {
      scaleAnimationRef.current.stop();
    }
    if (opacityAnimationRef.current) {
      opacityAnimationRef.current.stop();
    }
    
    // Animasyonları hemen başlat
    scaleAnimationRef.current = Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 500,
      friction: 7,
    });
    
    opacityAnimationRef.current = Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    });
    
    scaleAnimationRef.current.start();
    opacityAnimationRef.current.start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
              opacity: opacityAnim,
            },
          ]}
        />
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function TableHeader({ onQRScan, onSidebarPress, showBackButton = false, onBackPress, onInfoPress, hideNotifications = false }) {
  const { showNotifications } = useNotification();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        {showBackButton ? (
          <AnimatedButton
            style={styles.sidebarButton}
            onPress={onBackPress}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="arrow-back" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            </View>
          </AnimatedButton>
        ) : (
          <AnimatedButton
            style={styles.sidebarButton}
            onPress={onSidebarPress}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="menu" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            </View>
          </AnimatedButton>
        )}

        <TouchableOpacity 
          style={styles.shopInfo}
          onPress={onInfoPress}
          activeOpacity={0.7}
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {!hideNotifications && (
          <AnimatedButton
            style={styles.notificationButton}
            onPress={showNotifications}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="notifications" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            </View>
          </AnimatedButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8B4513',
    paddingBottom: 8,
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
    width: isLargeScreen ? 44 : isMediumScreen ? 42 : 40,
    height: isLargeScreen ? 44 : isMediumScreen ? 42 : 40,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  logoImage: {
    width: isLargeScreen ? 80 : isMediumScreen ? 75 : 70,
    height: isLargeScreen ? 80 : isMediumScreen ? 75 : 70,
  },
  notificationButton: {
    width: isLargeScreen ? 44 : isMediumScreen ? 42 : 40,
    height: isLargeScreen ? 44 : isMediumScreen ? 42 : 40,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
});
