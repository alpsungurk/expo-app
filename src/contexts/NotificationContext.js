import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Dimensions, Platform, Alert, AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { CommonActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { supabase } from '../config/supabase';
import { navigationRef } from '../navigation/AppNavigator';
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
  const [cachedNotifications, setCachedNotifications] = useState([]); // Local state'te tutulan bildirimler - sadece push notification'lar
  const notificationListener = useRef();
  const responseListener = useRef();
  const notificationSlideAnim = useRef(new Animated.Value(0)).current;
  
  // Bildirimlerin cache süresi (24 saat = 24 * 60 * 60 * 1000 ms)
  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  
  // Hata gösterimini kontrol etmek için (ard arda hata göstermemek için)
  const lastErrorTimeRef = useRef(0);
  const lastErrorMessageRef = useRef('');
  const ERROR_COOLDOWN = 10000; // 10 saniye içinde aynı hatayı tekrar gösterme
  
  // İzin reddedildi flag'i için AsyncStorage key
  const PERMISSION_DENIED_KEY = 'notification_permission_denied';

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

      // EAS Build ile oluşturulmuş standalone app'lerde Device.isDevice false dönebilir
      // Bu yüzden kontrolü kaldırdık - her durumda token almaya çalışıyoruz
      if (!Device.isDevice) {
        console.log('Device.isDevice false - standalone app olabilir, token almaya devam ediliyor');
      }

      // İzin daha önce reddedildiyse, bir daha deneme
      const permissionDenied = await AsyncStorage.getItem(PERMISSION_DENIED_KEY);
      if (permissionDenied === 'true') {
        console.log('⚠️ Bildirim izni daha önce reddedilmiş, token alınmayacak');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Mevcut izin durumu:', existingStatus);
      let finalStatus = existingStatus;
      
      // İzin verilmemişse ve daha önce reddedilmemişse, bir kez iste
      if (existingStatus !== 'granted') {
        console.log('İzin isteniyor...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('İzin sonucu:', status);
        
        // İzin reddedildiyse kaydet ve bir daha deneme
        if (status === 'denied') {
          console.log('⚠️ Bildirim izni reddedildi, bir daha istenmeyecek');
          await AsyncStorage.setItem(PERMISSION_DENIED_KEY, 'true');
          Toast.show({
            type: 'error',
            text1: 'Bildirim İzni',
            text2: 'Push bildirimlerini almak için bildirim izni gereklidir. Lütfen ayarlardan izin verin.',
            position: 'top',
            visibilityTime: 4000,
          });
          return null;
        }
      }
      
      if (finalStatus !== 'granted') {
        console.error('Bildirim izni alınamadı');
        return null;
      }
      
      // İzin verildi, denied flag'ini temizle (kullanıcı ayarlardan izin vermiş olabilir)
      await AsyncStorage.removeItem(PERMISSION_DENIED_KEY);
      
      // Project ID'yi environment variable veya app config'den al
      // Standalone build'lerde farklı Constants yapıları kullanılabilir
      let projectId = 
        // Önce manifest2'den dene (Expo SDK 50+)
        Constants.manifest2?.extra?.expoClient?.extra?.projectId ||
        Constants.manifest2?.extra?.expoClient?.extra?.eas?.projectId ||
        Constants.manifest2?.extra?.projectId ||
        Constants.manifest2?.extra?.eas?.projectId ||
        // Sonra expoConfig'den dene
        Constants.expoConfig?.extra?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        // Eski manifest yapısından dene
        Constants.manifest?.extra?.projectId ||
        Constants.manifest?.extra?.eas?.projectId ||
        // Environment variable'dan dene
        process.env.EXPO_PUBLIC_PROJECT_ID;
      
      // Eğer hala bulunamadıysa, app.config.js'den sabit değeri kullan
      if (!projectId) {
        projectId = 'f2793cf7-6dcf-4754-8d0a-92d5b4859b33';
        console.log('Project ID app.config.js\'den sabit değer olarak alındı:', projectId);
      }
      
      console.log('Project ID:', projectId);
      console.log('Constants.expoConfig:', Constants.expoConfig?.extra);
      console.log('Constants.manifest2:', Constants.manifest2?.extra);
      console.log('Constants.manifest:', Constants.manifest?.extra);
      
      // Token al - projectId her zaman olmalı
      const tokenOptions = { projectId };
      
      console.log('Token alınıyor...', { projectId: projectId.substring(0, 8) + '...' });
      console.log('Token options:', JSON.stringify(tokenOptions));
      
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync(tokenOptions);
        token = tokenResponse?.data;
        console.log('✅ Expo Push Token başarıyla alındı:', token ? token.substring(0, 30) + '...' : 'null');
        
        if (!token) {
          console.error('❌ Token response data boş!');
          console.error('Token response:', JSON.stringify(tokenResponse));
        }
        
        return token;
      } catch (tokenError) {
        // Network hatası (503, connection error vb.) - izin hatası değil, sessizce atla
        const isNetworkError = 
          tokenError.code === 'ERR_NOTIFICATIONS_SERVER_ERROR' ||
          tokenError.message?.includes('503') ||
          tokenError.message?.includes('network') ||
          tokenError.message?.includes('fetch') ||
          tokenError.message?.includes('connection') ||
          tokenError.message?.includes('upstream connect error');
        
        if (isNetworkError) {
          console.warn('⚠️ Network hatası (Expo servislerine erişilemiyor), token alınamadı. İzin sorunu değil.');
          // Network hatası izin hatası değil, flag kaydetme ve sessizce dön
          return null;
        }
        
        console.error('❌ getExpoPushTokenAsync hatası:', tokenError);
        console.error('Hata tipi:', tokenError.constructor.name);
        console.error('Hata mesajı:', tokenError.message);
        console.error('Hata kodu:', tokenError.code);
        
        // Özel hata mesajları
        if (tokenError.message?.includes('credentials')) {
          console.error('⚠️ CREDENTIALS HATASI: EAS Build\'de Android push notification credentials eksik olabilir!');
          console.error('Çözüm: https://expo.dev/accounts/alpsungurk/projects/expo-app/credentials adresinden credentials kontrol edin');
        }
        
        if (tokenError.message?.includes('projectId') || tokenError.message?.includes('project')) {
          console.error('⚠️ PROJECT ID HATASI: Project ID bulunamadı veya geçersiz!');
          console.error('Mevcut Project ID:', projectId);
        }
        
        throw tokenError; // Hata yukarı catch bloğuna gitsin
      }
    } catch (error) {
      // Network hatası kontrolü - izin hatası değil
      const isNetworkError = 
        error.code === 'ERR_NOTIFICATIONS_SERVER_ERROR' ||
        error.message?.includes('503') ||
        error.message?.includes('network') ||
        error.message?.includes('fetch') ||
        error.message?.includes('connection') ||
        error.message?.includes('upstream connect error');
      
      if (isNetworkError) {
        console.warn('⚠️ Network hatası (Expo servislerine erişilemiyor), token alınamadı. İzin sorunu değil.');
        // Network hatası izin hatası değil, flag kaydetme ve sessizce dön
        return null;
      }
      
      // İzin hatası kontrolü - sadece gerçek izin hatalarında flag kaydet
      const isPermissionError = 
        error.message?.includes('permission') ||
        error.message?.includes('denied') ||
        error.code === 'ERR_NOTIFICATIONS_PERMISSION_DENIED';
      
      if (isPermissionError) {
        console.warn('⚠️ Bildirim izni hatası');
        await AsyncStorage.setItem(PERMISSION_DENIED_KEY, 'true');
        Toast.show({
          type: 'error',
          text1: 'Bildirim İzni',
          text2: 'Push bildirimlerini almak için bildirim izni gereklidir. Lütfen ayarlardan izin verin.',
          position: 'top',
          visibilityTime: 4000,
        });
        return null;
      }
      
      // Diğer hatalar için
      console.error('❌ Push notification token alma hatası (genel):', error);
      console.error('Hata tipi:', error.constructor.name);
      console.error('Hata mesajı:', error.message);
      console.error('Hata kodu:', error.code);
      
      // Aynı hatayı 10 saniye içinde tekrar gösterme
      const errorMessage = error.message || 'Bilinmeyen hata';
      const now = Date.now();
      
      if (now - lastErrorTimeRef.current < ERROR_COOLDOWN && lastErrorMessageRef.current === errorMessage) {
        // Sessizce atla, kullanıcıya gösterme
        return null;
      }
      
      lastErrorTimeRef.current = now;
      lastErrorMessageRef.current = errorMessage;
      
      // Kullanıcıya bilgilendirme (sadece bir kez)
      Toast.show({
        type: 'error',
        text1: 'Push Token Hatası',
        text2: `Push token alınamadı: ${errorMessage}`,
        position: 'top',
        visibilityTime: 4000,
      });
      
      // Hata durumunda da null dön, UI'da "yükleniyor" mesajı gösterilir
      return null;
    }
  }

  // Push token'ı Supabase'e kaydet (cihaz bazlı)
  async function savePushTokenToSupabase(token) {
    console.log('🔵 savePushTokenToSupabase fonksiyonu çağrıldı');
    try {
      if (!token) {
        console.log('⚠️ Token yok, kaydedilemedi');
        return;
      }
      
      console.log('📝 Token veritabanına kaydediliyor:', token.substring(0, 30) + '...');

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

      // push_tokens tablosuna kaydet veya güncelle - upsert kullan (daha güvenli)
      // upsert: eğer kayıt varsa güncelle, yoksa ekle
      console.log('Token upsert yapılıyor...');
      const { data: upsertData, error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          {
            push_token: token,
            device_info: deviceInfo,
            device_id: deviceId,
            is_active: true,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'push_token', // push_token kolonuna göre conflict kontrolü
            ignoreDuplicates: false, // Duplicate'leri ignore etme, güncelle
          }
        )
        .select();

      if (upsertError) {
        console.error('❌ Push token upsert hatası:', upsertError);
        console.error('Hata kodu:', upsertError.code);
        console.error('Hata mesajı:', upsertError.message);
        console.error('Hata detayları:', upsertError.details);
        
        // Eğer upsert başarısız olursa (onConflict çalışmazsa), manuel update dene
        if (upsertError.code === '23505' || upsertError.message?.includes('unique constraint')) {
          console.log('⚠️ Upsert başarısız, manuel update deneniyor...');
          const { data: updateData, error: updateError } = await supabase
            .from('push_tokens')
            .update({
              device_info: deviceInfo,
              device_id: deviceId,
              is_active: true,
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('push_token', token)
            .select();

          if (updateError) {
            console.error('❌ Manuel update hatası:', updateError);
          } else {
            console.log('✅ Push token başarıyla güncellendi (manuel update)');
            console.log('Güncellenen kayıt:', updateData);
          }
        }
      } else {
        console.log('✅ Push token başarıyla kaydedildi/güncellendi (upsert)');
        console.log('Kayıt:', upsertData);
      }

      // Aynı cihazın eski token'larını pasif yap (eğer farklı bir token varsa)
      const { error: deactivateError } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('device_id', deviceId)
        .neq('push_token', token);

      if (deactivateError) {
        console.error('⚠️ Eski token pasif yapma hatası:', deactivateError);
      } else {
        console.log('✅ Eski token\'lar pasif yapıldı (varsa)');
      }
      
      console.log('✅ savePushTokenToSupabase fonksiyonu tamamlandı');
    } catch (error) {
      console.error('❌ Push token kaydetme hatası (catch):', error);
      console.error('Hata stack:', error.stack);
    }
  }

  // Push token'ı al ve kaydet (hem mount'ta hem de uygulama açıldığında kullanılacak)
  const registerAndSavePushToken = async () => {
    console.log('🟢 registerAndSavePushToken başlatıldı');
    
    // İzin daha önce reddedildiyse, bir daha deneme
    const permissionDenied = await AsyncStorage.getItem(PERMISSION_DENIED_KEY);
    if (permissionDenied === 'true') {
      console.log('⚠️ Bildirim izni daha önce reddedilmiş, token alınmayacak');
      return false;
    }
    
    try {
      // İlk denemede biraz bekle (APK'da app tam başlamadan token alma sorunu olabilir)
      console.log('⏳ 1 saniye bekleniyor...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📱 Push token alınıyor...');
      const token = await registerForPushNotificationsAsync();
      console.log('📱 Token alındı:', token ? token.substring(0, 30) + '...' : 'null');
      
      if (token) {
        console.log('✅ Token başarıyla alındı, state\'e kaydediliyor...');
        setExpoPushToken(token);
        console.log('💾 Token veritabanına kaydediliyor...');
        await savePushTokenToSupabase(token);
        console.log('✅ registerAndSavePushToken başarıyla tamamlandı');
        return true;
      } else {
        console.log('⚠️ Token alınamadı - token null (izin reddedilmiş olabilir)');
        return false;
      }
    } catch (error) {
      console.error('❌ Token alma hatası:', error);
      console.error('Hata stack:', error.stack);
      return false;
    }
  };

  useEffect(() => {
    // İlk mount'ta push token'ı al ve kaydet
    registerAndSavePushToken();

    // Uygulama foreground'a geçtiğinde izin durumunu kontrol et
    // Eğer izin verildiyse token'ı al, reddedildiyse tekrar deneme
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('Uygulama foreground\'a geçti, izin durumu kontrol ediliyor...');
        // İzin durumunu kontrol et, eğer verildiyse token'ı al
        const permissionDenied = await AsyncStorage.getItem(PERMISSION_DENIED_KEY);
        if (permissionDenied !== 'true') {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            console.log('İzin verilmiş, token alınıyor...');
            // İzin verildiyse denied flag'ini temizle
            await AsyncStorage.removeItem(PERMISSION_DENIED_KEY);
            registerAndSavePushToken();
          } else {
            console.log('İzin verilmemiş, token alınmayacak');
          }
        } else {
          console.log('İzin daha önce reddedilmiş, token alınmayacak');
        }
      }
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      console.log('Notification received:', notification);
      
      // Yeni push notification geldiğinde local state'e ekle
      if (notification.request.content.data) {
        const notificationData = notification.request.content.data;
        const newNotification = {
          id: notificationData.id || Date.now().toString(),
          baslik: notification.request.content.title || notificationData.baslik || 'Yeni Bildirim',
          icerik: notification.request.content.body || notificationData.icerik || '',
          tip: notificationData.tip || 'sistem',
          olusturma_tarihi: notificationData.olusturma_tarihi || new Date().toISOString(),
          aktif: true,
        };
        
        // Eğer aynı bildirim yoksa ekle (duplicate kontrolü)
        setCachedNotifications(prev => {
          const exists = prev.find(n => n.id === newNotification.id);
          if (exists) return prev;
          return [newNotification, ...prev].slice(0, 100); // En fazla 100 bildirim tut
        });
      }
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
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // AppState listener'ı temizle
      subscription?.remove();
    };
  }, []);

  const showNotifications = () => {
    setNotificationsVisible(true);
    // Animasyon kaldırıldı - direkt göster
  };

  const hideNotifications = (immediate = false) => {
    // Animasyon kaldırıldı - direkt kapat
    setNotificationsVisible(false);
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
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: 'Push token bulunamadı. Lütfen uygulamayı yeniden başlatın.',
        position: 'top',
        visibilityTime: 4000,
      });
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
         // skipLog true ise hata gösterme (ard arda hata göstermemek için)
        if (!result.skipLog) {
          const errorMessage = result.error || 'Bildirim gönderilemedi';
          const now = Date.now();
          
          // Aynı hatayı 10 saniye içinde tekrar gösterme
          if (now - lastErrorTimeRef.current >= ERROR_COOLDOWN || lastErrorMessageRef.current !== errorMessage) {
            lastErrorTimeRef.current = now;
            lastErrorMessageRef.current = errorMessage;
            Toast.show({
              type: 'error',
              text1: 'Hata',
              text2: errorMessage,
              position: 'top',
              visibilityTime: 4000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Test push notification hatası:', error);
      const errorMessage = error.message || 'Bildirim gönderilemedi';
      const now = Date.now();
      
      // Aynı hatayı 10 saniye içinde tekrar gösterme
      if (now - lastErrorTimeRef.current >= ERROR_COOLDOWN || lastErrorMessageRef.current !== errorMessage) {
        lastErrorTimeRef.current = now;
        lastErrorMessageRef.current = errorMessage;
        Toast.show({
          type: 'error',
          text1: 'Hata',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });
      }
    }
  };

  // Eski bildirimleri temizle (24 saatten eski olanları kaldır)
  const cleanOldNotifications = () => {
    const now = Date.now();
    setCachedNotifications(prev => {
      return prev.filter(notif => {
        const notifTime = new Date(notif.olusturma_tarihi).getTime();
        return (now - notifTime) < CACHE_DURATION;
      });
    });
  };
  
  // Her 5 dakikada bir eski bildirimleri temizle
  useEffect(() => {
    const cleanInterval = setInterval(cleanOldNotifications, 5 * 60 * 1000);
    
    return () => {
      clearInterval(cleanInterval);
    };
  }, []);

  const value = {
    showNotifications,
    hideNotifications,
    notificationsVisible,
    expoPushToken,
    notification,
    sendTestNotification,
    sendTestPushNotification,
    cachedNotifications,
    cleanOldNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Global Notifications Modal */}
      {notificationsVisible && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <NotificationsScreen 
            onClose={hideNotifications}
            onNavigateToLogin={() => {
              hideNotifications();
              // Navigation ref kullanarak LoginScreen'e git
              setTimeout(() => {
                if (navigationRef.current) {
                  navigationRef.current.dispatch(
                    CommonActions.navigate({
                      name: 'LoginScreen',
                    })
                  );
                }
              }, 100);
            }}
          />
        </View>
      )}
    </NotificationContext.Provider>
  );
};

