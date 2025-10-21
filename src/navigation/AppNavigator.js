import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../store/cartStore';

import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import OrderStatusScreen from '../screens/OrderStatusScreen';
import QRScanScreen from '../screens/QRScanScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain" component={CartScreen} />
      <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { getTotalItems } = useCartStore();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Menü') {
              iconName = focused ? 'cafe' : 'cafe-outline';
            } else if (route.name === 'Sepet') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Sipariş Ver') {
              iconName = focused ? 'qr-code' : 'qr-code-outline';
            } else if (route.name === 'Duyurular') {
              iconName = focused ? 'megaphone' : 'megaphone-outline';
            } else if (route.name === 'Siparişlerim') {
              iconName = focused ? 'receipt' : 'receipt-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#8B4513',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            height: 60 + Math.max(insets.bottom, 0),
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Menü" 
          component={HomeStack}
          options={{
            tabBarBadge: undefined,
          }}
        />
        <Tab.Screen 
          name="Sepet" 
          component={CartStack}
          options={{
            tabBarBadge: getTotalItems() > 0 ? getTotalItems() : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'System',
            },
          }}
        />
        <Tab.Screen 
          name="Sipariş Ver" 
          component={QRScanScreen}
          options={{
            tabBarBadge: undefined,
          }}
        />
        <Tab.Screen 
          name="Siparişlerim" 
          component={OrderStatusScreen}
          options={{
            tabBarBadge: undefined,
          }}
        />
            <Tab.Screen 
          name="Duyurular" 
          component={AnnouncementsScreen}
          options={{
            tabBarBadge: undefined,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

