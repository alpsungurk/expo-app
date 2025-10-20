export default {
  expo: {
    name: "Kahve Dükkanı",
    slug: "kahve-dukkani",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#8B4513"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "Bu uygulama masa QR kodlarını taramak için kameraya erişim gerektirir."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#8B4513"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.CAMERA"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Bu uygulama masa QR kodlarını taramak için kameraya erişim gerektirir."
        }
      ]
    ],
    extra: {
      supabaseUrl: "https://hgxicutwejvfysjsmjcw.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGljdXR3ZWp2ZnlzanNtamN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjAwNDYsImV4cCI6MjA3NjE5NjA0Nn0.4rNe3GfRBXkG3Dfei5-tsfLXb_9EHGt39oPrtwuO0nE"
    }
  }
};
