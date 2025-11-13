import Constants from 'expo-constants';

// Google OAuth Configuration
// Android için Google Client ID
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 
                                process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || // Fallback: genel Client ID
                                Constants.expoConfig?.extra?.googleClientIdAndroid;

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

