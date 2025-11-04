# Expo Push Notification Kullanım Kılavuzu

## 📋 Gereksinimler

1. **Expo Project ID** - `.env` dosyasına `EXPO_PUBLIC_PROJECT_ID` eklenmeli
2. **Supabase Edge Functions** - Push notification göndermek için
3. **Push Token'lar** - Kullanıcıların push token'ları `kullanici_profilleri` tablosunda saklanıyor

## 🚀 Kurulum

### 1. Supabase Edge Function Deploy Etme

```bash
# Supabase CLI ile (eğer kuruluysa)
supabase functions deploy send-push-notification

# Veya Supabase Dashboard'dan:
# 1. Supabase Dashboard'a gidin
# 2. Edge Functions > Create Function
# 3. Function adı: send-push-notification
# 4. supabase/functions/send-push-notification/index.ts dosyasının içeriğini yapıştırın
# 5. Deploy edin
```

### 2. Environment Variables

Supabase Edge Function için gerekli environment variables otomatik olarak ayarlanır (SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY).

## 💻 Kullanım Örnekleri

### Örnek 1: Tek Kullanıcıya Bildirim Gönderme

```javascript
import { sendPushNotificationToUser } from './src/utils/pushNotification';

// Kullanıcı ID'si ile
const result = await sendPushNotificationToUser(
  'user-uuid-here',
  'Yeni Sipariş',
  'Siparişiniz alındı ve hazırlanıyor.',
  { siparisId: 123, tip: 'siparis' }
);

if (result.success) {
  console.log('Bildirim gönderildi!');
} else {
  console.error('Hata:', result.error);
}
```

### Örnek 2: Sipariş Durumu Değiştiğinde

```javascript
import { sendOrderStatusNotification } from './src/utils/pushNotification';

// Sipariş durumu değiştiğinde
await sendOrderStatusNotification(
  'user-uuid-here',
  'SIP-2024-001',
  'hazir'
);
```

### Örnek 3: Tüm Kullanıcılara Bildirim

```javascript
import { sendPushNotificationToAllUsers } from './src/utils/pushNotification';

// Tüm kullanıcılara duyuru
await sendPushNotificationToAllUsers(
  'Yeni Kampanya',
  'Özel indirim kampanyamız başladı! %20 indirim.',
  { kampanyaId: 456, tip: 'kampanya' }
);
```

### Örnek 4: Belirli Token'lara Bildirim

```javascript
import { sendPushNotificationToTokens } from './src/utils/pushNotification';

// Birden fazla token'a
const tokens = [
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]',
];

await sendPushNotificationToTokens(
  tokens,
  'Yeni Ürün',
  'Menümüze yeni ürünler eklendi!',
  { tip: 'yeni_urun' }
);
```

## 🔧 Supabase'den Direkt Çağırma

Edge Function'ı Supabase'den direkt çağırabilirsiniz:

```javascript
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-uuid-here',
    title: 'Başlık',
    body: 'İçerik',
    data: { /* ek veri */ }
  }
});
```

## 📱 Notification Handler (Notification'a Tıklandığında)

Notification'a tıklandığında yapılacak işlemler için `NotificationContext.js` içindeki `responseListener` kullanılabilir:

```javascript
// NotificationContext.js içinde zaten var
responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  // Örnek: Sipariş detayına yönlendirme
  if (data.type === 'order_status') {
    navigation.navigate('OrderDetail', { siparisNo: data.siparisNo });
  }
});
```

## 🧪 Test Etme

### 1. Test Bildirimi (Lokal)

```javascript
import { useNotification } from '../contexts/NotificationContext';

const { sendTestNotification } = useNotification();
await sendTestNotification(); // 2 saniye sonra test bildirimi gönderir
```

### 2. Expo Push Notification Tool

[Expo Push Notification Tool](https://expo.dev/notifications) kullanarak manuel test yapabilirsiniz.

## 📊 Push Token Formatı

Expo push token'ları şu formatta olmalıdır:
```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

Token'lar otomatik olarak `kullanici_profilleri` tablosuna kaydedilir.

## ⚠️ Önemli Notlar

1. **Fiziksel Cihaz Gerekli**: Push notification'lar sadece fiziksel cihazlarda çalışır (emulator'de çalışmaz)
2. **Expo Go**: Expo Go uygulamasında push notification'lar çalışır
3. **Standalone App**: Production build'de de çalışır
4. **Token Güncelleme**: Token'lar kullanıcı uygulamayı yeniden yüklediğinde değişebilir
5. **Rate Limiting**: Expo'nun API'si rate limit'e sahiptir, çok fazla istek göndermeyin

## 🔐 Güvenlik

- Edge Function'lar Supabase Service Role Key kullanır
- Production'da RLS (Row Level Security) politikalarını kontrol edin
- Push token'ları güvenli şekilde saklayın

## 📚 Daha Fazla Bilgi

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification API](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

