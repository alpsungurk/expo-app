import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';

import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import EditCartItemScreen from '../screens/EditCartItemScreen';
import OrderStatusScreen from '../screens/OrderStatusScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import QRScanScreen from '../screens/QRScanScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import AnnouncementDetailScreen from '../screens/AnnouncementDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import KasaScreen from '../screens/KasaScreen';
import KasaOrderDetailScreen from '../screens/KasaOrderDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain" component={CartScreen} />
      <Stack.Screen name="EditCartItem" component={EditCartItemScreen} />
      <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
    </Stack.Navigator>
  );
}

function OrderStatusStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderStatusMain" component={OrderStatusScreen} />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
          },
        }}
      />
    </Stack.Navigator>
  );
}

function AnnouncementsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: 'modal',
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateY: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.height, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="AnnouncementsMain" component={AnnouncementsScreen} />
      <Stack.Screen 
        name="AnnouncementDetail" 
        component={AnnouncementDetailScreen}
        options={{
          presentation: 'transparentModal',
          cardOverlayEnabled: true,
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
          },
        }}
      />
    </Stack.Navigator>
  );
}

function KasaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KasaMain" component={KasaScreen} />
      <Stack.Screen 
        name="KasaOrderDetail" 
        component={KasaOrderDetailScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 350,
                useNativeDriver: true,
              },
            },
          },
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { getTotalItems } = useCartStore();
  const { isProductModalOpen, getActiveOrdersCount } = useAppStore();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="KasaScreen" component={KasaStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainTabNavigator() {
  const { getTotalItems } = useCartStore();
  const { isProductModalOpen, getActiveOrdersCount } = useAppStore();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let iconSize = size;

            if (route.name === 'Menü') {
              iconName = focused ? 'cafe' : 'cafe-outline';
              iconSize = size; // Normal boyut
            } else if (route.name === 'Sepet') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Sipariş Ver') {
              iconName = focused ? 'qr-code' : 'qr-code-outline';
            } else if (route.name === 'Duyurular') {
              iconName = focused ? 'megaphone' : 'megaphone-outline';
            } else if (route.name === 'Siparişlerim') {
              iconName = focused ? 'receipt' : 'receipt-outline';
            }

            return <Ionicons name={iconName} size={iconSize} color={color} />;
          },
          tabBarActiveTintColor: '#8B4513',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 10,
            height: 70 + Math.max(insets.bottom, 0),
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
          options={({ route }) => ({
            tabBarBadge: undefined,
            tabBarStyle: ((route) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'HomeMain';
              
              // OrderDetail ekranındaysa tab bar'ı gizle
              if (routeName === 'OrderDetail') {
                return { display: 'none' };
              }
              
              // Product modal açıksa tab bar'ı gizle
              if (isProductModalOpen) {
                return { display: 'none' };
              }
              
              // Diğer durumlarda normal tab bar
              return {
                paddingBottom: Math.max(insets.bottom, 10),
                paddingTop: 10,
                height: 70 + Math.max(insets.bottom, 0),
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              };
            })(route),
          })}
        />
        <Tab.Screen 
          name="Sepet" 
          component={CartStack}
          options={({ route }) => ({
            tabBarBadge: getTotalItems() > 0 ? getTotalItems() : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'System',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              textAlign: 'center',
              lineHeight: 18,
            },
            tabBarStyle: ((route) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'CartMain';
              
              // OrderDetail ekranındaysa tab bar'ı gizle
              if (routeName === 'OrderDetail') {
                return { display: 'none' };
              }
              
              // Diğer durumlarda normal tab bar
              return {
                paddingBottom: Math.max(insets.bottom, 10),
                paddingTop: 10,
                height: 70 + Math.max(insets.bottom, 0),
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              };
            })(route),
          })}
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
          component={OrderStatusStack}
          options={({ route }) => ({
            tabBarBadge: getActiveOrdersCount() > 0 ? getActiveOrdersCount() : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#F59E0B', // Turuncu - beklemede/hazırlanıyor rengi
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'System',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              textAlign: 'center',
              lineHeight: 18,
            },
            tabBarStyle: ((route) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'OrderStatusMain';
              
              // OrderDetail ekranındaysa tab bar'ı gizle
              if (routeName === 'OrderDetail') {
                return { display: 'none' };
              }
              
              // Diğer durumlarda normal tab bar
              return {
                paddingBottom: Math.max(insets.bottom, 10),
                paddingTop: 10,
                height: 70 + Math.max(insets.bottom, 0),
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              };
            })(route),
          })}
        />
            <Tab.Screen 
          name="Duyurular" 
          component={AnnouncementsStack}
          options={({ route }) => ({
            tabBarBadge: undefined,
            tabBarStyle: ((route) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'AnnouncementsMain';
              
              // AnnouncementDetail ekranındaysa tab bar'ı gizle
              if (routeName === 'AnnouncementDetail') {
                return { display: 'none' };
              }
              
              // Diğer durumlarda normal tab bar
              return {
                paddingBottom: Math.max(insets.bottom, 10),
                paddingTop: 10,
                height: 70 + Math.max(insets.bottom, 0),
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              };
            })(route),
          })}
        />
      </Tab.Navigator>
  );
}

