/**
 * Güvenli Logger Utility
 * Production'da console.log'ları devre dışı bırakır
 * Sadece development modunda log yapar
 */

import Constants from 'expo-constants';

const isDevelopment = __DEV__ || Constants.executionEnvironment === 'storeClient';
const isProduction = !isDevelopment;

/**
 * Güvenli log fonksiyonu
 * Production'da hiçbir şey loglamaz
 */
export const safeLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Güvenli error log fonksiyonu
 * Production'da sadece generic mesaj loglar, detay vermez
 */
export const safeError = (error, context = '') => {
  if (isDevelopment) {
    console.error(`[${context}]`, error);
  } else {
    // Production'da sadece generic mesaj
    console.error(`[${context}] Bir hata oluştu`);
  }
};

/**
 * Güvenli warn log fonksiyonu
 */
export const safeWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Güvenli info log fonksiyonu
 */
export const safeInfo = (...args) => {
  if (isDevelopment) {
    console.info(...args);
  }
};

/**
 * Debug log - sadece development
 */
export const safeDebug = (...args) => {
  if (isDevelopment) {
    console.debug(...args);
  }
};

/**
 * Güvenli error mesajı oluştur
 * Production'da sensitive bilgi içermez
 */
export const getSafeErrorMessage = (error, defaultMessage = 'Bir hata oluştu') => {
  if (isProduction) {
    return defaultMessage;
  }
  
  // Development'da detaylı mesaj
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
};

/**
 * Stack trace'i güvenli şekilde logla
 * Production'da stack trace loglanmaz
 */
export const safeStackTrace = (error, context = '') => {
  if (isDevelopment && error?.stack) {
    console.error(`[${context}] Stack trace:`, error.stack);
  }
};

export default {
  log: safeLog,
  error: safeError,
  warn: safeWarn,
  info: safeInfo,
  debug: safeDebug,
  getSafeErrorMessage,
  safeStackTrace,
  isDevelopment,
  isProduction,
};

