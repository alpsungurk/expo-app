import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Dimensions, Platform, Alert, AppState } from 'react-native';
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
  const [cachedNotifications, setCachedNotifications] = useState([]); // Local state'te tutulan bildirimler - sadece push notification'lar
  const notificationListener = useRef();
  const responseListener = useRef();
  const notificationSlideAnim = useRef(new Animated.Value(0)).current;
  
  // Bildirimlerin cache süresi (24 saat = 24 * 60 * 60 * 1000 ms)
  const CACHE_DURATION = 24 * 60 * 60 * 1000;

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
        console.error('❌ getExpoPushTokenAsync hatası:', tokenError);
        console.error('Hata tipi:', tokenError.constructor.name);
        console.error('Hata mesajı:', tokenError.message);
        console.error('Hata kodu:', tokenError.code);
        console.error('Hata stack:', tokenError.stack);
        
        // Özel hata mesajları
        if (tokenError.message?.includes('credentials')) {
          console.error('⚠️ CREDENTIALS HATASI: EAS Build\'de Android push notification credentials eksik olabilir!');
          console.error('Çözüm: https://expo.dev/accounts/alpsungurk/projects/expo-app/credentials adresinden credentials kontrol edin');
        }
        
        if (tokenError.message?.includes('projectId') || tokenError.message?.includes('project')) {
          console.error('⚠️ PROJECT ID HATASI: Project ID bulunamadı veya geçersiz!');
          console.error('Mevcut Project ID:', projectId);
        }
        
        if (tokenError.message?.includes('network') || tokenError.message?.includes('fetch')) {
          console.error('⚠️ NETWORK HATASI: İnternet bağlantısı veya Expo servislerine erişim sorunu!');
        }
        
        throw tokenError; // Hata yukarı catch bloğuna gitsin
      }
    } catch (error) {
      console.error('❌ Push notification token alma hatası (genel):', error);
      console.error('Hata tipi:', error.constructor.name);
      console.error('Hata mesajı:', error.message);
      console.error('Hata kodu:', error.code);
      console.error('Hata detayları:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('Hata stack:', error.stack);
      
      // Kullanıcıya bilgilendirme
      Alert.alert(
        'Push Token Hatası',
        `Push token alınamadı: ${error.message || 'Bilinmeyen hata'}\n\nLütfen logları kontrol edin.`,
        [{ text: 'Tamam' }]
      );
      
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
        console.log('Mevcut token bulundu, güncelleniyor...', existingToken.id);
        const { data: updatedData, error: updateError } = await supabase
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
          console.error('❌ Push token güncelleme hatası:', updateError);
          console.error('Hata kodu:', updateError.code);
          console.error('Hata mesajı:', updateError.message);
        } else {
          console.log('✅ Push token başarıyla güncellendi (mevcut token)');
          console.log('Güncellenen kayıt:', updatedData);
        }
      } else {
        // Yeni token ekle
        console.log('Yeni token ekleniyor...');
        const { data: insertedData, error: insertError } = await supabase
          .from('push_tokens')
          .insert({
            push_token: token,
            device_info: deviceInfo,
            device_id: deviceId,
            is_active: true,
            last_active: new Date().toISOString(),
          })
          .select();

        if (insertError) {
          console.error('❌ Push token ekleme hatası:', insertError);
          console.error('Hata kodu:', insertError.code);
          console.error('Hata mesajı:', insertError.message);
          console.error('Hata detayları:', insertError.details);
          
          // Eğer unique constraint hatası varsa (başka bir kayıt aynı token'a sahip), güncelle
          if (insertError.code === '23505') {
            console.log('⚠️ Token zaten var (unique constraint), güncelleniyor...');
            const { data: upsertData, error: upsertError } = await supabase
              .from('push_tokens')
              .update({
                device_info: deviceInfo,
                device_id: deviceId,
                is_active: true,
                last_active: new Date().toISOString(),
              })
              .eq('push_token', token)
              .select();

            if (upsertError) {
              console.error('❌ Push token upsert hatası:', upsertError);
            } else {
              console.log('✅ Push token başarıyla güncellendi (upsert)');
              console.log('Güncellenen kayıt:', upsertData);
            }
          }
        } else {
          console.log('✅ Push token başarıyla kaydedildi (yeni token)');
          console.log('Eklenen kayıt:', insertedData);
        }
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
  const registerAndSavePushToken = async (retryCount = 0) => {
    console.log(`🟢 registerAndSavePushToken başlatıldı (deneme: ${retryCount + 1})`);
    try {
      // İlk denemede biraz bekle (APK'da app tam başlamadan token alma sorunu olabilir)
      if (retryCount === 0) {
        console.log('⏳ 1 saniye bekleniyor...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
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
        console.log('⚠️ Token alınamadı - token null');
        
        // Retry mekanizması: 3 kez deneme yap
        if (retryCount < 3) {
          const waitTime = 2000 * (retryCount + 1);
          console.log(`🔄 Token alma başarısız, ${waitTime}ms sonra ${retryCount + 2}. deneme yapılacak...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return await registerAndSavePushToken(retryCount + 1);
        }
        
        console.error('❌ Token alma başarısız - maksimum deneme sayısına ulaşıldı');
        return false;
      }
    } catch (error) {
      console.error('❌ Token alma hatası:', error);
      console.error('Hata stack:', error.stack);
      
      // Hata durumunda da retry yap
      if (retryCount < 3) {
        const waitTime = 2000 * (retryCount + 1);
        console.log(`🔄 Token alma hatası, ${waitTime}ms sonra ${retryCount + 2}. deneme yapılacak...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return await registerAndSavePushToken(retryCount + 1);
      }
      
      console.error('❌ Token alma hatası - maksimum deneme sayısına ulaşıldı');
      return false;
    }
  };

  useEffect(() => {
    // İlk mount'ta push token'ı al ve kaydet
    registerAndSavePushToken();

    // Uygulama foreground'a geçtiğinde push token'ı tekrar kaydet
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('Uygulama foreground\'a geçti, push token kaydediliyor...');
        registerAndSavePushToken();
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

