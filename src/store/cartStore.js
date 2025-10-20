import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  items: [],
  tableNumber: null,
  qrToken: null,
};

// Action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  SET_TABLE_INFO: 'SET_TABLE_INFO',
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { product, customizations, notes } = action.payload;
      const items = state.items;
      const existingItemIndex = items.findIndex(
        item => 
          item.id === product.id && 
          JSON.stringify(item.customizations) === JSON.stringify(customizations)
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex].quantity += 1;
        return { ...state, items: updatedItems };
      } else {
        const newItem = {
          id: product.id,
          name: product.ad,
          price: product.fiyat,
          quantity: 1,
          customizations,
          notes,
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
        tableNumber: action.payload.tableNumber, 
        qrToken: action.payload.qrToken 
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

  const addItem = (product, customizations = {}, notes = '') => {
    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: { product, customizations, notes }
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

  const setTableInfo = (tableNumber, qrToken) => {
    dispatch({
      type: CART_ACTIONS.SET_TABLE_INFO,
      payload: { tableNumber, qrToken }
    });
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => {
      let itemPrice = item.price;
      
      Object.values(item.customizations).forEach(customization => {
        if (customization.price) {
          itemPrice += customization.price;
        }
      });
      
      return total + (itemPrice * item.quantity);
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
