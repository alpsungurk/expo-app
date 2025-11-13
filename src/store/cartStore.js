import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase, TABLES } from '../config/supabase';

// Telefon token oluştur veya al
const getOrCreatePhoneToken = async () => {
  try {
    let token = await AsyncStorage.getItem('phoneToken');
    if (!token) {
      // Benzersiz token oluştur: timestamp + random
      token = `PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await AsyncStorage.setItem('phoneToken', token);
    }
    return token;
  } catch (error) {
    console.error('Phone token hatası:', error);
    return `PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

// Initial state
const initialState = {
  items: [],
  tableId: null,      // Masa ID (masalar tablosundan)
  tableNumber: null,  // Masa numarası (gösterim için)
  phoneToken: null,   // Cihaz kimliği
};

// Action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  UPDATE_ITEM_NOTES: 'UPDATE_ITEM_NOTES',
  CLEAR_CART: 'CLEAR_CART',
  SET_TABLE_INFO: 'SET_TABLE_INFO',
  CLEAR_TABLE_INFO: 'CLEAR_TABLE_INFO',
  SET_PHONE_TOKEN: 'SET_PHONE_TOKEN',
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { product, customizations, notes, quantity } = action.payload;
      const items = state.items;
      const existingItemIndex = items.findIndex(
        item => 
          item.id === product.id && 
          JSON.stringify(item.customizations || {}) === JSON.stringify(customizations || {})
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex].quantity += (quantity || 1);
        return { ...state, items: updatedItems };
      } else {
        const newItem = {
          id: product.id,
          name: product.ad,
          price: product.fiyat,
          quantity: quantity || 1,
          customizations: customizations || {},
          notes: notes || '',
          image: product.resim_path,
          preparationTime: product.hazirlanma_suresi || 5,
        };
        return { ...state, items: [...items, newItem] };
      }
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const { itemId, customizations } = action.payload;
      
      // Customizations karşılaştırması için normalize edilmiş JSON kullan
      const normalizeCustomizations = (obj) => {
        if (!obj || Object.keys(obj).length === 0) return '{}';
        const sorted = Object.keys(obj).sort().reduce((acc, key) => {
          acc[key] = obj[key];
          return acc;
        }, {});
        return JSON.stringify(sorted);
      };
      
      const payloadCustomizationsNormalized = normalizeCustomizations(customizations);
      
      const filteredItems = state.items.filter(
        item => {
          const itemCustomizationsNormalized = normalizeCustomizations(item.customizations);
          const shouldRemove = item.id === itemId && itemCustomizationsNormalized === payloadCustomizationsNormalized;
          return !shouldRemove;
        }
      );
      
      return { ...state, items: filteredItems };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { itemId, customizations, newQuantity } = action.payload;
      const updatedItems = state.items.map(item => {
        if (item.id === itemId && 
            JSON.stringify(item.customizations) === JSON.stringify(customizations)) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return { ...state, items: updatedItems };
    }

    case CART_ACTIONS.UPDATE_ITEM_NOTES: {
      const { itemId, customizations, newNotes } = action.payload;
      const updatedItems = state.items.map(item => {
        if (item.id === itemId && 
            JSON.stringify(item.customizations) === JSON.stringify(customizations)) {
          return { ...item, notes: newNotes };
        }
        return item;
      });
      return { ...state, items: updatedItems };
    }

    case CART_ACTIONS.CLEAR_CART:
      return { ...state, items: [] };

    case CART_ACTIONS.SET_TABLE_INFO:
      return { 
        ...state, 
        tableId: action.payload.tableId,
        tableNumber: action.payload.tableNumber
      };

    case CART_ACTIONS.CLEAR_TABLE_INFO:
      return {
        ...state,
        tableId: null,
        tableNumber: null
      };

    case CART_ACTIONS.SET_PHONE_TOKEN:
      return {
        ...state,
        phoneToken: action.payload
      };

    default:
      return state;
  }
};

// Context
const CartContext = createContext();

// Provider
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Telefon token'ı yükle
  useEffect(() => {
    const loadPhoneToken = async () => {
      const token = await getOrCreatePhoneToken();
      dispatch({
        type: CART_ACTIONS.SET_PHONE_TOKEN,
        payload: token
      });
    };
    loadPhoneToken();
  }, []);

  const addItem = (productData) => {
    const { quantity, notes, ...product } = productData;
    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: { 
        product, 
        customizations: {}, 
        notes: notes || '', 
        quantity: quantity || 1 
      }
    });
  };

  const removeItem = (itemId, customizations = {}) => {
    dispatch({
      type: CART_ACTIONS.REMOVE_ITEM,
      payload: { itemId, customizations }
    });
  };

  const updateQuantity = (itemId, customizations, newQuantity) => {
    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { itemId, customizations, newQuantity }
    });
  };

  const updateItemNotes = (itemId, customizations, newNotes) => {
    dispatch({
      type: CART_ACTIONS.UPDATE_ITEM_NOTES,
      payload: { itemId, customizations, newNotes }
    });
  };

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  };

  const setTableInfo = (tableId, tableNumber) => {
    dispatch({
      type: CART_ACTIONS.SET_TABLE_INFO,
      payload: { tableId, tableNumber }
    });
  };

  const clearTableInfo = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_TABLE_INFO });
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Sipariş oluşturma fonksiyonu
  const createOrder = async (phoneToken) => {
    if (!state.tableId) {
      throw new Error('Masa bilgisi bulunamadı. Lütfen QR kodu tekrar tarayın.');
    }

    if (state.items.length === 0) {
      throw new Error('Sepetiniz boş.');
    }

    try {
      // Sipariş numarası oluştur
      const generateOrderNumber = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SIP${timestamp}${random}`;
      };

      const orderNumber = generateOrderNumber();
      const totalAmount = getTotalPrice();

      // Push token ID'sini bul (expo push token ve telefon_token ile eşleştir)
      let pushTokenId = null;
      try {
        // 1. Önce expo push token ile ara (en güvenilir yöntem)
        let expoPushToken = null;
        try {
          // Expo push token'ı al
          const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId: 'f2793cf7-6dcf-4754-8d0a-92d5b4859b33'
          });
          expoPushToken = tokenResponse?.data;
          
          if (expoPushToken) {
            const { data: expoTokenData, error: expoTokenError } = await supabase
              .from('push_tokens')
              .select('id')
              .eq('is_active', true)
              .eq('push_token', expoPushToken)
              .maybeSingle();
            
            if (!expoTokenError && expoTokenData?.id) {
              pushTokenId = expoTokenData.id;
              console.log('Push token ID bulundu (expo push token):', pushTokenId);
            }
          }
        } catch (e) {
          console.log('Expo push token alınamadı:', e);
        }

        // 2. Expo push token ile bulunamadıysa, device_info içinde telefon_token ara
        if (!pushTokenId) {
          const { data: pushTokenData, error: pushTokenError } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('is_active', true)
            .eq('device_info->>telefon_token', phoneToken)
            .maybeSingle();
          
          if (!pushTokenError && pushTokenData?.id) {
            pushTokenId = pushTokenData.id;
            console.log('Push token ID bulundu (device_info->telefon_token):', pushTokenId);
          }
        }

        // 3. Hala bulunamadıysa device_id ile dene
        if (!pushTokenId) {
          const { data: deviceIdData, error: deviceIdError } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('is_active', true)
            .eq('device_id', phoneToken)
            .maybeSingle();
          
          if (!deviceIdError && deviceIdData?.id) {
            pushTokenId = deviceIdData.id;
            console.log('Push token ID bulundu (device_id):', pushTokenId);
          }
        }

        // 4. Eğer hala bulunamadıysa ve expo push token varsa, push token'ı kaydet
        if (!pushTokenId && expoPushToken) {
          try {
            console.log('Push token bulunamadı, yeni kayıt oluşturuluyor...');
            
            // Cihaz bilgilerini topla
            const deviceInfo = {
              platform: Platform.OS,
              modelName: Device.modelName || 'Unknown',
              osName: Device.osName || 'Unknown',
              osVersion: Device.osVersion || 'Unknown',
              brand: Device.brand || 'Unknown',
              manufacturer: Device.manufacturer || 'Unknown',
              telefon_token: phoneToken,
            };

            const deviceId = `${Platform.OS}_${Device.modelName || 'unknown'}_${Device.osVersion || 'unknown'}`.replace(/\s+/g, '_');

            // Push token'ı kaydet
            const { data: newTokenData, error: insertError } = await supabase
              .from('push_tokens')
              .insert({
                push_token: expoPushToken,
                device_info: deviceInfo,
                device_id: deviceId,
                is_active: true,
                last_active: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (!insertError && newTokenData?.id) {
              pushTokenId = newTokenData.id;
              console.log('Push token kaydedildi ve ID alındı:', pushTokenId);
            } else {
              console.error('Push token kaydetme hatası:', insertError);
              
              // Eğer unique constraint hatası varsa (duplicate key), güncelle
              if (insertError?.code === '23505') {
                console.log('⚠️ Token zaten var (unique constraint), güncelleniyor...');
                const { data: updatedTokenData, error: updateError } = await supabase
                  .from('push_tokens')
                  .update({
                    device_info: deviceInfo,
                    device_id: deviceId,
                    is_active: true,
                    last_active: new Date().toISOString(),
                  })
                  .eq('push_token', expoPushToken)
                  .select('id')
                  .single();

                if (!updateError && updatedTokenData?.id) {
                  pushTokenId = updatedTokenData.id;
                  console.log('✅ Push token başarıyla güncellendi (upsert), ID:', pushTokenId);
                } else {
                  console.error('❌ Push token güncelleme hatası:', updateError);
                }
              }
            }
          } catch (saveError) {
            console.error('Push token kaydetme hatası:', saveError);
          }
        }

        if (!pushTokenId) {
          console.log('Push token ID bulunamadı ve kaydedilemedi, telefon_token:', phoneToken);
          console.log('Sipariş push_token_id olmadan oluşturulacak');
        }
      } catch (error) {
        console.error('Push token ID bulma hatası:', error);
        // Hata olsa bile sipariş oluşturulmaya devam eder
      }

      // Sipariş oluştur
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .insert({
          masa_id: state.tableId,
          siparis_no: orderNumber,
          toplam_tutar: totalAmount,
          durum: 'beklemede',
          aciklama: null,
          telefon_token: phoneToken,
          push_token_id: pushTokenId
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Sipariş detaylarını oluştur
      const orderDetails = state.items.map(item => ({
        siparis_id: orderData.id,
        urun_id: item.id,
        adet: item.quantity,
        birim_fiyat: parseFloat(item.price),
        toplam_fiyat: parseFloat(item.price) * item.quantity,
        ozellestirmeler: item.customizations ? JSON.stringify(item.customizations) : null,
        notlar: item.notes || null
      }));

      const { error: detailsError } = await supabase
        .from(TABLES.SIPARIS_DETAYLARI)
        .insert(orderDetails);

      if (detailsError) throw detailsError;

      // Sepeti temizle
      clearCart();

      return {
        ...orderData,
        siparis_detaylari: orderDetails
      };

    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      throw error;
    }
  };

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    updateItemNotes,
    clearCart,
    setTableInfo,
    clearTableInfo,
    getTotalPrice,
    getTotalItems,
    createOrder,
    dispatch,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Hook
export const useCartStore = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartStore must be used within a CartProvider');
  }
  return context;
};
