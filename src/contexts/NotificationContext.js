import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Dimensions, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../config/supabase';
import NotificationsScreen from '../screens/NotificationsScreen';

// Notification handler yapılandırması
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const notificationSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Push notification izinlerini kontrol et ve token al
    registerForPushNotificationsAsync().then(token => {
      console.log('Token alındı:', token);
      if (token) {
        setExpoPushToken(token);
        savePushTokenToSupabase(token);
      } else {
        console.log('Token alınamadı - token null');
      }
    }).catch(error => {
      console.error('Token alma hatası:', error);
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      console.log('Notification received:', notification);
    });

    // Notification response listener (kullanıcı bildirime tıkladığında)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      // Burada notification'a tıklandığında yapılacak işlemler yapılabilir
      // Örneğin: belirli bir ekrana yönlendirme
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Push notification izinlerini kontrol et ve token al
  async function registerForPushNotificationsAsync() {
    try {
      // Web platformunda push notification çalışmaz (VAPID key gerektirir)
      if (Platform.OS === 'web') {
        console.log('Web platformunda push notification desteklenmiyor');
        return null;
      }

      let token;
      console.log('Push notification token alma başlatıldı...');
      console.log('Platform:', Platform.OS);
      console.log('isDevice:', Device.isDevice);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('Android notification channel oluşturuldu');
      }

      if (!Device.isDevice) {
        console.warn('Fiziksel cihaz değil - push notification çalışmayabilir');
        // EAS Build ile oluşturulmuş standalone app'lerde Device.isDevice false dönebilir
        // Bu durumda yine de token almaya çalışalım
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Mevcut izin durumu:', existingStatus);
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('İzin isteniyor...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('İzin sonucu:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.error('Bildirim izni reddedildi');
        Alert.alert(
          'Bildirim İzni',
          'Push bildirimlerini almak için bildirim izni gereklidir. Lütfen ayarlardan izin verin.',
          [{ text: 'Tamam' }]
        );
        return null;
      }
      
      // Project ID'yi environment variable veya app config'den al
      // Önce Constants.expoConfig'den dene (build'de mevcut)
      const projectId = Constants.expoConfig?.extra?.projectId ||
                       Constants.expoConfig?.extra?.eas?.projectId ||
                       process.env.EXPO_PUBLIC_PROJECT_ID;
      
      console.log('Project ID:', projectId || 'Bulunamadı');
      console.log('Constants.expoConfig:', Constants.expoConfig?.extra);
      
      // Project ID yoksa bile token almaya çalış (standalone app'lerde bazen gerekli olmayabilir)
      const tokenOptions = projectId ? { projectId } : {};
      
      console.log('Token alınıyor...', tokenOptions);
      const tokenResponse = await Notifications.getExpoPushTokenAsync(tokenOptions);
      token = tokenResponse.data;
      console.log('Expo Push Token alındı:', token);
      
      return token;
    } catch (error) {
      console.error('Push notification token alma hatası:', error);
      console.error('Hata detayı:', error.message);
      // Hata durumunda da null dön, UI'da "yükleniyor" mesajı gösterilir
      return null;
    }
  }

  // Push token'ı Supabase'e kaydet (cihaz bazlı)
  async function savePushTokenToSupabase(token) {
    try {
      if (!token) {
        console.log('Token yok, kaydedilemedi');
        return;
      }

      // telefon_token'ı AsyncStorage'dan al
      let telefonToken = null;
      try {
        telefonToken = await AsyncStorage.getItem('phoneToken');
      } catch (error) {
        console.error('telefon_token okuma hatası:', error);
      }

      // Cihaz bilgilerini topla
      const deviceInfo = {
        platform: Platform.OS,
        modelName: Device.modelName || 'Unknown',
        osName: Device.osName || 'Unknown',
        osVersion: Device.osVersion || 'Unknown',
        brand: Device.brand || 'Unknown',
        manufacturer: Device.manufacturer || 'Unknown',
        ...(telefonToken && { telefon_token: telefonToken }), // telefon_token'ı device_info içinde sakla
      };

      // Device ID oluştur (model + osVersion kombinasyonu)
      const deviceId = `${Platform.OS}_${Device.modelName || 'unknown'}_${Device.osVersion || 'unknown'}`.replace(/\s+/g, '_');

      console.log('Push token kaydediliyor:', {
        token: token.substring(0, 30) + '...',
        deviceId,
        deviceInfo
      });

      // push_tokens tablosuna kaydet veya güncelle
      // Eğer aynı token varsa güncelle, yoksa yeni kayıt ekle
      const { data: existingToken, error: checkError } = await supabase
        .from('push_tokens')
        .select('id, push_token, device_id')
        .eq('push_token', token)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Token kontrol hatası:', checkError);
      }

      if (existingToken) {
        // Token zaten var, güncelle
        const { error: updateError } = await supabase
          .from('push_tokens')
          .update({
            device_info: deviceInfo,
            device_id: deviceId,
            is_active: true,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('push_token', token);

        if (updateError) {
          console.error('Push token güncelleme hatası:', updateError);
        } else {
          console.log('Push token güncellendi (mevcut token)');
        }
      } else {
        // Yeni token ekle
        const { error: insertError } = await supabase
          .from('push_tokens')
          .insert({
            push_token: token,
            device_info: deviceInfo,
            device_id: deviceId,
            is_active: true,
            last_active: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Push token ekleme hatası:', insertError);
          
          // Eğer unique constraint hatası varsa (başka bir kayıt aynı token'a sahip), güncelle
          if (insertError.code === '23505') {
            console.log('Token zaten var, güncelleniyor...');
            const { error: upsertError } = await supabase
              .from('push_tokens')
              .update({
                device_info: deviceInfo,
                device_id: deviceId,
                is_active: true,
                last_active: new Date().toISOString(),
              })
              .eq('push_token', token);

            if (upsertError) {
              console.error('Push token upsert hatası:', upsertError);
            } else {
              console.log('Push token başarıyla güncellendi');
            }
          }
        } else {
          console.log('Push token başarıyla kaydedildi (yeni token)');
        }
      }

      // Aynı cihazın eski token'larını pasif yap (eğer farklı bir token varsa)
      const { error: deactivateError } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('device_id', deviceId)
        .neq('push_token', token);

      if (deactivateError) {
        console.error('Eski token pasif yapma hatası:', deactivateError);
      }
    } catch (error) {
      console.error('Push token kaydetme hatası:', error);
    }
  }

  const showNotifications = () => {
    setNotificationsVisible(true);
    // Bildirim modal'ı açılırken aşağıdan yukarıya animasyon
    Animated.timing(notificationSlideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideNotifications = () => {
    // Bildirim modal'ı kapanırken yukarıdan aşağıya animasyon
    Animated.timing(notificationSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotificationsVisible(false);
    });
  };

  // Test bildirimi gönder (lokal, 2 saniye sonra)
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Bildirimi",
        body: 'Bu bir test bildirimidir!',
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });
  };

  // Push notification test gönder (Expo Push API'ye)
  const sendTestPushNotification = async () => {
    if (!expoPushToken) {
      Alert.alert('Hata', 'Push token bulunamadı. Lütfen uygulamayı yeniden başlatın.');
      return;
    }

    try {
      const { sendTestPushNotification: sendTestPush } = await import('../utils/pushNotification');
      const result = await sendTestPush(
        expoPushToken,
        'Test Push Notification',
        'Bu bir test push bildirimidir! Uygulama açıkken de çalışır.',
        { test: true, timestamp: Date.now() },
        {
          sound: 'default',
          channelId: 'default',
        }
      );

      if (result.success) {
        Alert.alert('Başarılı', 'Push notification gönderildi!');
      } else {
        Alert.alert('Hata', result.error || 'Bildirim gönderilemedi');
      }
    } catch (error) {
      console.error('Test push notification hatası:', error);
      Alert.alert('Hata', error.message || 'Bildirim gönderilemedi');
    }
  };

  const value = {
    showNotifications,
    hideNotifications,
    notificationsVisible,
    expoPushToken,
    notification,
    sendTestNotification,
    sendTestPushNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Global Notifications Modal */}
      {notificationsVisible && (
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
            },
            {
              transform: [
                {
                  translateY: notificationSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <NotificationsScreen onClose={hideNotifications} />
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

