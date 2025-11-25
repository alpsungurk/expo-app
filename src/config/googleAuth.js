import Constants from 'expo-constants';

// Google OAuth Configuration
// Sadece Web Application Client ID kullanıyoruz (Android Client ID gerekmez)
// Web Application Client ID (ID token almak için gerekli)
// Production'da environment variable zorunludur
// Hem EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB hem de EXPO_PUBLIC_GOOGLE_CLIENT_ID destekleniyor
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 
                                    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
                                    Constants.expoConfig?.extra?.googleClientIdWeb ||
                                    Constants.expoConfig?.extra?.googleClientId;

// Güvenlik kontrolü - Production'da environment variable zorunlu
if (!__DEV__ && !GOOGLE_WEB_CLIENT_ID) {
  throw new Error('Google OAuth Client ID yapılandırması eksik. Lütfen EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB environment variable\'ını ayarlayın.');
}

// Eski Android Client ID (artık kullanılmıyor, geriye dönük uyumluluk için)
export const GOOGLE_CLIENT_ID = GOOGLE_WEB_CLIENT_ID;

// Google OAuth Endpoints
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

// Google OAuth Scopes
export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
];

// Redirect Path
export const GOOGLE_REDIRECT_PATH = 'auth/callback';

