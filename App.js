import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { CartProvider } from './src/store/cartStore';
import { AppProvider } from './src/store/appStore';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { supabase } from './src/config/supabase';
import Toast from 'react-native-toast-message';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Deep linking listener - Google OAuth redirect sonrası session'ı yakala
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const { url } = event;
      console.log('Deep link received:', url);
      
      // OAuth callback URL'i kontrol et
      if (url && url.includes('auth/callback')) {
        // Supabase session'ını kontrol et
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error after redirect:', error);
        } else if (session) {
          console.log('✅ Session after redirect:', session.user?.email);
        }
      }
    };

    // İlk açılışta mevcut URL'i kontrol et
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Deep link listener'ı ekle
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <ThemeProvider>
          <AppProvider>
            <CartProvider>
              <NotificationProvider>
                <AppNavigator />
                <StatusBar style="light" />
                <Toast />
              </NotificationProvider>
            </CartProvider>
          </AppProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
