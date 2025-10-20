import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function CategoryCard({ category, onPress, isSelected = false }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation with stagger effect
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const color = category.color || '#6B7280';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }]
      },
      isSelected && {
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.3,
        shadowRadius: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
        elevation: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
      }
    ]}>
      <TouchableOpacity
        onPress={() => onPress(category)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isSelected ? 'white' : `${color}20`,
              transform: [{
                scale: scaleAnim.interpolate({
                  inputRange: [0.95, 1],
                  outputRange: [0.9, 1.1]
                })
              }]
            }
          ]}
        >
          <Text style={[
            styles.emoji,
            {
              color: isSelected ? color : color,
              fontSize: isLargeScreen ? 28 : isMediumScreen ? 24 : 20
            }
          ]}>
            {category.icon || '🍽️'}
          </Text>
        </Animated.View>

        <Text
          style={[
            styles.title,
            isSelected && {
              color: 'white',
              fontWeight: 'bold',
              fontSize: isLargeScreen ? 14 : isMediumScreen ? 12 : 10
            }
          ]}
        >
          {category.ad}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 85, // Sabit genişlik
    width: 85, // Sabit genişlik
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  touchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },
});
