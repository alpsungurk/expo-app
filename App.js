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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://072b1800aca8e73a2058359d15922407@o4510362111508480.ingest.de.sentry.io/4510362115768400',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function App() {
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
        try {
          // URL'den hash fragment veya query params'ı al
          let hashFragment = '';
          let queryParams = '';
          
          if (url.includes('#')) {
            hashFragment = url.split('#')[1];
          } else if (url.includes('?')) {
            queryParams = url.split('?')[1];
          }
          
          // Hash fragment'ten veya query params'tan token'ları çıkar
          const urlParams = new URLSearchParams(hashFragment || queryParams);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          const errorParam = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');

          if (errorParam) {
            console.error('OAuth error from deep link:', errorParam, errorDescription);
            return;
          }

          if (accessToken && refreshToken) {
            // Session'ı set et
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Session error after deep link:', sessionError);
            } else if (sessionData?.user) {
              console.log('✅ Session set from deep link:', sessionData.user?.email);
              // Auth state listener otomatik olarak state'leri güncelleyecek
            }
          } else {
            // Token'lar yoksa mevcut session'ı kontrol et
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Session error after redirect:', error);
            } else if (session) {
              console.log('✅ Session after redirect:', session.user?.email);
            }
          }
        } catch (error) {
          console.error('Deep link handling error:', error);
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});