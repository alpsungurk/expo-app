import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

      // Sipariş oluştur
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .insert({
          masa_id: state.tableId,
          siparis_no: orderNumber,
          toplam_tutar: totalAmount,
          durum: 'beklemede',
          aciklama: 'Müşteri siparişi',
          telefon_token: phoneToken
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
