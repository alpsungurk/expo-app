# Push Notification Test Kılavuzu

## 🧪 Test Etme Yöntemleri

### Yöntem 1: NotificationContext Hook'u ile (Önerilen)

Herhangi bir component'te kullanabilirsiniz:

```javascript
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { expoPushToken, sendTestPushNotification, sendTestNotification } = useNotification();

  const handleTestPush = async () => {
    // Push notification gönder (Expo Push API)
    await sendTestPushNotification();
  };

  const handleTestLocal = async () => {
    // Lokal test bildirimi (2 saniye sonra)
    await sendTestNotification();
  };

  return (
    <View>
      <Text>Push Token: {expoPushToken}</Text>
      <Button title="Test Push Notification" onPress={handleTestPush} />
      <Button title="Test Local Notification" onPress={handleTestLocal} />
    </View>
  );
}
```

### Yöntem 2: Direkt Utility Fonksiyonu ile

```javascript
import { sendTestPushNotification } from '../utils/pushNotification';
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { expoPushToken } = useNotification();

  const handleTest = async () => {
    if (!expoPushToken) {
      alert('Push token bulunamadı');
      return;
    }

    const result = await sendTestPushNotification(
      expoPushToken,
      'Test Başlık',
      'Test mesajı',
      { test: true },
      {
        sound: 'default',
        channelId: 'default',
      }
    );

    if (result.success) {
      console.log('Başarılı!', result.receiptId);
    } else {
      console.error('Hata:', result.error);
    }
  };

  return <Button title="Test" onPress={handleTest} />;
}
```

### Yöntem 3: Expo Push Notification Tool (Web)

1. [Expo Push Notification Tool](https://expo.dev/notifications)'a gidin
2. Push token'ı girin (`expoPushToken` değerini kopyalayın)
3. Başlık ve mesaj girin
4. "Send a Notification" butonuna tıklayın

## 📱 Push Token Alma

Push token'ı almak için:

```javascript
import { useNotification } from '../contexts/NotificationContext';

const { expoPushToken } = useNotification();
console.log('Push Token:', expoPushToken);
```

Token formatı: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`

## ⚙️ Seçenekler

### iOS Seçenekleri
```javascript
await sendTestPushNotification(
  expoPushToken,
  'Başlık',
  'Mesaj',
  { data: 'test' },
  {
    subtitle: 'Alt başlık',        // iOS subtitle
    badge: 1,                       // Badge count
    soundName: 'default',           // Sound name
  }
);
```

### Android Seçenekleri
```javascript
await sendTestPushNotification(
  expoPushToken,
  'Başlık',
  'Mesaj',
  { data: 'test' },
  {
    channelId: 'default',           // Notification channel
    priority: 'high',               // 'default' | 'normal' | 'high'
  }
);
```

### Genel Seçenekler
```javascript
await sendTestPushNotification(
  expoPushToken,
  'Başlık',
  'Mesaj',
  { data: 'test' },
  {
    ttl: 3600,                      // Time to live (saniye)
    accessToken: 'your-token',       // Push security enabled ise
  }
);
```

## 🔍 Hata Ayıklama

### Push Token Bulunamıyor
- Fiziksel cihaz kullanıldığından emin olun (emulator çalışmaz)
- Bildirim izni verildiğinden emin olun
- Uygulamayı yeniden başlatın

### Bildirim Gelmiyor
- Push token'ın doğru olduğunu kontrol edin
- Expo Go kullanıyorsanız, Expo Go uygulamasının güncel olduğundan emin olun
- Cihazın internete bağlı olduğundan emin olun
- Console log'ları kontrol edin

### "Invalid Token" Hatası
- Token formatını kontrol edin: `ExponentPushToken[...]` şeklinde olmalı
- Token'ın güncel olduğundan emin olun (uygulama yeniden yüklendiğinde değişebilir)

## 📊 Başarılı Yanıt

```javascript
{
  success: true,
  result: {
    status: 'ok',
    id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  },
  receiptId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
}
```

## ❌ Hata Yanıtı

```javascript
{
  success: false,
  error: 'Hata mesajı',
  details: { /* detaylı hata bilgisi */ }
}
```

## 🎯 Hızlı Test

ProfileScreen veya başka bir ekranda test butonu ekleyin:

```javascript
import { useNotification } from '../contexts/NotificationContext';

// Component içinde
const { expoPushToken, sendTestPushNotification } = useNotification();

<TouchableOpacity onPress={sendTestPushNotification}>
  <Text>Push Notification Test</Text>
</TouchableOpacity>
```

