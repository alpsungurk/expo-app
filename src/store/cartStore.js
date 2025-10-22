import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const filteredItems = state.items.filter(
        item => 
          !(item.id === itemId && 
            JSON.stringify(item.customizations) === JSON.stringify(customizations))
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

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setTableInfo,
    clearTableInfo,
    getTotalPrice,
    getTotalItems,
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
