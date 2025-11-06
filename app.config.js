export default {
  expo: {
    name: 'expo-app',
    slug: 'expo-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kahvedukkani.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.kahvedukkani.app',
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
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      expoPushApiUrl: process.env.EXPO_PUBLIC_EXPO_PUSH_API_URL,
      s3StorageUrl: process.env.EXPO_PUBLIC_S3_STORAGE_URL,
      // Expo Project ID - EAS project ID'si kullanılacak
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

