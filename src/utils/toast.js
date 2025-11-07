import Toast from 'react-native-toast-message';

/**
 * Toast mesaj gösterir
 * @param {string} message - Gösterilecek mesaj
 * @param {string} type - 'success' (yeşil), 'error' (kırmızı), 'info' (beyaz/nötr)
 * @param {string} title - Başlık (opsiyonel)
 * @param {number} duration - Görünür kalma süresi (ms, varsayılan: 3000)
 */
export const showToast = (message, type = 'info', title = null, duration = 3000) => {
  Toast.show({
    type: type,
    text1: title || (type === 'success' ? 'Başarılı' : type === 'error' ? 'Hata' : 'Bilgi'),
    text2: message,
    position: 'top',
    visibilityTime: duration,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Başarı mesajı gösterir (yeşil)
 */
export const showSuccess = (message, title = 'Başarılı', duration = 3000) => {
  showToast(message, 'success', title, duration);
};

/**
 * Hata mesajı gösterir (kırmızı)
 */
export const showError = (message, title = 'Hata', duration = 3000) => {
  showToast(message, 'error', title, duration);
};

/**
 * Bilgi mesajı gösterir (beyaz/nötr)
 */
export const showInfo = (message, title = 'Bilgi', duration = 3000) => {
  showToast(message, 'info', title, duration);
};

