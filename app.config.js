export default {
  expo: {
    name: 'expo-app',
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
      'expo-web-browser',
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined,
      expoPushApiUrl: process.env.EXPO_PUBLIC_EXPO_PUSH_API_URL || undefined,
      s3StorageUrl: process.env.EXPO_PUBLIC_S3_STORAGE_URL || undefined,
      // Google OAuth Configuration
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || undefined,
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

