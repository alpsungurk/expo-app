/**
 * Güvenli Error Handler
 * Production'da sensitive bilgi sızıntısını önler
 */

import { getSafeErrorMessage, safeError, safeStackTrace } from './logger';

/**
 * Güvenli error mesajı oluştur
 * Production'da stack trace ve detaylı hata bilgisi içermez
 */
export const createSafeError = (error, context = '') => {
  const isProduction = !__DEV__;
  
  // Production'da generic mesaj
  if (isProduction) {
    return {
      message: 'Bir hata oluştu. Lütfen tekrar deneyin.',
      code: error?.code || 'UNKNOWN_ERROR',
      context,
    };
  }
  
  // Development'da detaylı bilgi
  return {
    message: getSafeErrorMessage(error),
    code: error?.code || 'UNKNOWN_ERROR',
    context,
    stack: error?.stack,
    originalError: error,
  };
};

/**
 * API error handler
 * Network ve API hatalarını güvenli şekilde handle eder
 */
export const handleAPIError = (error, defaultMessage = 'İşlem başarısız oldu') => {
  const isProduction = !__DEV__;
  
  // Network hatası
  if (error?.message?.includes('network') || error?.code === 'NETWORK_ERROR') {
    return {
      message: 'İnternet bağlantınızı kontrol edin',
      code: 'NETWORK_ERROR',
      userFriendly: true,
    };
  }
  
  // Timeout hatası
  if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
    return {
      message: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
      code: 'TIMEOUT',
      userFriendly: true,
    };
  }
  
  // Authentication hatası
  if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
    return {
      message: 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.',
      code: 'UNAUTHORIZED',
      userFriendly: true,
    };
  }
  
  // Forbidden hatası
  if (error?.status === 403 || error?.code === 'FORBIDDEN') {
    return {
      message: 'Bu işlem için yetkiniz bulunmamaktadır.',
      code: 'FORBIDDEN',
      userFriendly: true,
    };
  }
  
  // Not found hatası
  if (error?.status === 404 || error?.code === 'NOT_FOUND') {
    return {
      message: 'İstenen kaynak bulunamadı.',
      code: 'NOT_FOUND',
      userFriendly: true,
    };
  }
  
  // Server hatası
  if (error?.status >= 500) {
    return {
      message: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      code: 'SERVER_ERROR',
      userFriendly: true,
    };
  }
  
  // Production'da generic mesaj
  if (isProduction) {
    return {
      message: defaultMessage,
      code: error?.code || 'UNKNOWN_ERROR',
      userFriendly: true,
    };
  }
  
  // Development'da detaylı mesaj
  return {
    message: getSafeErrorMessage(error, defaultMessage),
    code: error?.code || 'UNKNOWN_ERROR',
    userFriendly: false,
    originalError: error,
  };
};

/**
 * Error logging - güvenli şekilde logla
 */
export const logError = (error, context = '') => {
  safeError(error, context);
  
  if (__DEV__) {
    safeStackTrace(error, context);
  }
  
  // Production'da error tracking servisine gönder (örn: Sentry)
  // Sentry.captureException(error, { tags: { context } });
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors) => {
  if (Array.isArray(errors) && errors.length > 0) {
    return {
      message: errors[0].message || 'Geçersiz veri',
      code: 'VALIDATION_ERROR',
      errors,
      userFriendly: true,
    };
  }
  
  return {
    message: 'Geçersiz veri',
    code: 'VALIDATION_ERROR',
    userFriendly: true,
  };
};

export default {
  createSafeError,
  handleAPIError,
  logError,
  handleValidationError,
};

