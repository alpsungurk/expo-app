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
      // Local Supabase Configuration
      // ÖNEMLİ: Telefondan erişim için 127.0.0.1 yerine PC'nizin yerel ağ IP adresini kullanın
      // IP adresinizi bulmak için: Windows'ta "ipconfig" komutunu çalıştırın
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "http://10.50.10.26:54321",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      
      // Production Supabase (yorum satırında bırakıldı)
      // supabaseUrl: "https://hgxicutwejvfysjsmjcw.supabase.co",
      // supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGljdXR3ZWp2ZnlzanNtamN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjAwNDYsImV4cCI6MjA3NjE5NjA0Nn0.4rNe3GfRBXkG3Dfei5-tsfLXb_9EHGt39oPrtwuO0nE"
    }
  }
};
