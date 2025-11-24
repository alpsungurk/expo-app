export default {
  expo: {
    name: 'İlk Coffee',
    slug: 'expo-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'com.kahvedukkani.app',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kahvedukkani.app',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'Bu uygulama QR kod okumak için kamera erişimine ihtiyaç duyar.',
        NSPhotoLibraryUsageDescription: 'Bu uygulama fotoğraf seçmek için fotoğraf kütüphanesi erişimine ihtiyaç duyar.',
        NSUserNotificationsUsageDescription: 'Bu uygulama size bildirimler göndermek için izin gerektirir.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
        monochromeImage: './assets/icon.png',
      },
      package: 'com.kahvedukkani.app',
      versionCode: 1,
      // Firebase için google-services.json dosyasının yolu
      // EAS Build sırasında bu dosya otomatik olarak yüklenir
      // Proje root'unda olmalı (EAS Build için)
      googleServicesFile: './google-services.json',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.INTERNET',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.VIBRATE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#8B4513',
          sounds: [],
          mode: 'production',
        },
      ],
      'expo-web-browser',
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined,
      expoPushApiUrl: process.env.EXPO_PUBLIC_EXPO_PUSH_API_URL || undefined,
      s3StorageUrl: process.env.EXPO_PUBLIC_S3_STORAGE_URL || undefined,
      // Google OAuth Client ID (Web Application için - ID token almak için gerekli)
      // Hem googleClientIdWeb hem de googleWebClientId olarak ekleniyor (uyumluluk için)
      googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '567674269605-equcfcmnvkiidevl7hlo1v84ol5r168j.apps.googleusercontent.com',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '567674269605-equcfcmnvkiidevl7hlo1v84ol5r168j.apps.googleusercontent.com',
      // Expo Project ID - EAS project ID'si kullanılacak
      // Bu değer standalone build'lerde push token almak için kritik
      projectId: 'f2793cf7-6dcf-4754-8d0a-92d5b4859b33',
      eas: {
        projectId: 'f2793cf7-6dcf-4754-8d0a-92d5b4859b33',
      },
    },
    notification: {
      icon: './assets/icon.png',
      color: '#8B4513',
      androidMode: 'default',
      androidCollapsedTitle: 'Yeni bildirim',
    },
  },
};

