import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/storage';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;

export default function ProductCard({ product, onPress, onAddToCart, onProductDetail }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Resim URL'sini Supabase Storage'dan al
  const imageUri = getImageUrl(product.resim_path);

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const formatPrice = (price) => {
    return `₺${parseFloat(price).toFixed(2)}`;
  };

  const getPreparationTime = (time) => {
    return time ? `${time} dk` : '5 dk';
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      <TouchableOpacity
        onPress={() => onProductDetail ? onProductDetail(product) : onPress(product)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <View style={[
          styles.imageContainer,
          { height: isLargeScreen ? 180 : isMediumScreen ? 160 : 140 }
        ]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cafe" size={isLargeScreen ? 50 : isMediumScreen ? 45 : 40} color="#8B4513" />
            </View>
          )}

          {product.populer && (
            <Animated.View style={[
              styles.popularBadge,
              {
                transform: [{
                  scale: scaleAnim.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}>
              <Text style={[
                styles.popularText,
                { fontSize: isLargeScreen ? 14 : isMediumScreen ? 12 : 10 }
              ]}>Popüler</Text>
            </Animated.View>
          )}

          {product.yeni_urun && (
            <Animated.View style={[
              styles.newBadge,
              {
                transform: [{
                  scale: scaleAnim.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}>
              <Text style={[
                styles.newText,
                { fontSize: isLargeScreen ? 14 : isMediumScreen ? 12 : 10 }
              ]}>Yeni</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[
            styles.title,
            {
              fontSize: isLargeScreen ? 18 : isMediumScreen ? 16 : 14,
              marginBottom: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
              lineHeight: isLargeScreen ? 22 : isMediumScreen ? 20 : 18,
            }
          ]} numberOfLines={2} ellipsizeMode="tail">
            {product.ad}
          </Text>

          {product.aciklama ? (
            <Text style={[
              styles.description,
              {
                fontSize: isLargeScreen ? 15 : isMediumScreen ? 14 : 12,
                lineHeight: isLargeScreen ? 22 : isMediumScreen ? 20 : 16,
                marginBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
              }
            ]} numberOfLines={2} ellipsizeMode="tail">
              {product.aciklama}
            </Text>
          ) : (
            <View style={{ height: isLargeScreen ? 12 : isMediumScreen ? 10 : 8 }} />
          )}

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={[
                styles.price,
                { fontSize: isLargeScreen ? 20 : isMediumScreen ? 18 : 16 }
              ]} numberOfLines={1} ellipsizeMode="tail">
                {formatPrice(product.fiyat)}
              </Text>
              <View style={styles.preparationTimeContainer}>
                <Ionicons 
                  name="time-outline" 
                  size={isLargeScreen ? 12 : isMediumScreen ? 11 : 10} 
                  color="#9CA3AF" 
                  style={styles.timeIcon}
                />
                <Text 
                  style={[
                    styles.preparationTime,
                    { fontSize: isLargeScreen ? 13 : isMediumScreen ? 12 : 10 }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {getPreparationTime(product.hazirlanma_suresi)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  width: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
                  height: isLargeScreen ? 48 : isMediumScreen ? 44 : 40,
                  borderRadius: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
                }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={isLargeScreen ? 24 : isMediumScreen ? 22 : 20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    height: isLargeScreen ? 360 : isMediumScreen ? 320 : 280,
    backgroundColor: 'white',
    borderRadius: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    marginBottom: isLargeScreen ? 20 : isMediumScreen ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
    elevation: isLargeScreen ? 4 : isMediumScreen ? 3 : 3,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  popularBadge: {
    position: 'absolute',
    top: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
    left: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
    paddingVertical: isLargeScreen ? 6 : isMediumScreen ? 4 : 3,
    borderRadius: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  popularText: {
    color: 'white',
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
    right: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
    backgroundColor: '#10B981',
    paddingHorizontal: isLargeScreen ? 10 : isMediumScreen ? 8 : 6,
    paddingVertical: isLargeScreen ? 6 : isMediumScreen ? 4 : 3,
    borderRadius: isLargeScreen ? 16 : isMediumScreen ? 12 : 8,
  },
  newText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    paddingTop: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
    paddingBottom: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
    justifyContent: 'space-between',
    minHeight: 0,
  },
  title: {
    fontWeight: 'bold',
    fontFamily: 'System',
    color: '#1F2937',
  },
  description: {
    fontFamily: 'System',
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: isLargeScreen ? 8 : isMediumScreen ? 6 : 4,
  },
  priceContainer: {
    flex: 1,
    minWidth: 0, // Text overflow için önemli
    marginRight: isLargeScreen ? 12 : isMediumScreen ? 10 : 8,
  },
  price: {
    fontWeight: 'bold',
    fontFamily: 'System',
    color: '#8B4513',
    marginBottom: 4,
  },
  preparationTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  timeIcon: {
    marginRight: 4,
  },
  preparationTime: {
    color: '#9CA3AF',
    fontFamily: 'System',
    flexShrink: 1,
  },
  addButton: {
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: isLargeScreen ? 5 : isMediumScreen ? 4 : 3,
    elevation: isLargeScreen ? 5 : isMediumScreen ? 4 : 4,
  },
});
