/**
 * Application Constants
 *
 * This file centralizes all constants used across the application.
 * Import from this file instead of defining constants in individual files.
 */

// Google OAuth Constants
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

// Google OAuth Scopes
export const GOOGLE_SCOPES = ['openid', 'profile', 'email'];

// Google OAuth Redirect URI (Expo proxy)
// useProxy: true kullanıldığında Expo otomatik olarak oluşturur
// Format: https://auth.expo.io/@username/slug
export const GOOGLE_REDIRECT_PATH = 'auth/callback';

// App Configuration
export const APP_SCHEME = 'com.kahvedukkani.app';

