import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  isLoading: false,
  currentOrder: null,
  orderStatus: null,
  campaigns: [],
  announcements: [],
  yeniOneriler: [],
  categories: [],
  products: [],
};

// Action types
const APP_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CURRENT_ORDER: 'SET_CURRENT_ORDER',
  SET_ORDER_STATUS: 'SET_ORDER_STATUS',
  SET_CAMPAIGNS: 'SET_CAMPAIGNS',
  SET_ANNOUNCEMENTS: 'SET_ANNOUNCEMENTS',
  SET_YENI_ONERILER: 'SET_YENI_ONERILER',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_PRODUCTS: 'SET_PRODUCTS'

};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case APP_ACTIONS.SET_CURRENT_ORDER:
      return { ...state, currentOrder: action.payload };
    case APP_ACTIONS.SET_ORDER_STATUS:
      return { ...state, orderStatus: action.payload };
    case APP_ACTIONS.SET_CAMPAIGNS:
      return { ...state, campaigns: action.payload };
    case APP_ACTIONS.SET_ANNOUNCEMENTS:
      return { ...state, announcements: action.payload };
    case APP_ACTIONS.SET_CATEGORIES:
      return { ...state, categories: action.payload };
    case APP_ACTIONS.SET_PRODUCTS:
      return { ...state, products: action.payload };
    case APP_ACTIONS.SET_YENI_ONERILER:
      return { ...state, yeniOneriler: action.payload };
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: loading });
  };

  const setCurrentOrder = (order) => {
    dispatch({ type: APP_ACTIONS.SET_CURRENT_ORDER, payload: order });
  };

  const setOrderStatus = (status) => {
    dispatch({ type: APP_ACTIONS.SET_ORDER_STATUS, payload: status });
  };

  const setCampaigns = (campaigns) => {
    dispatch({ type: APP_ACTIONS.SET_CAMPAIGNS, payload: campaigns });
  };

  const setAnnouncements = (announcements) => {
    dispatch({ type: APP_ACTIONS.SET_ANNOUNCEMENTS, payload: announcements });
  };

  const setCategories = (categories) => {
    dispatch({ type: APP_ACTIONS.SET_CATEGORIES, payload: categories });
  };

  const setProducts = (products) => {
    dispatch({ type: APP_ACTIONS.SET_PRODUCTS, payload: products });
  };
   
  const setYeniOneriler = (yeniOneriler) => {
    dispatch({ type: APP_ACTIONS.SET_YENI_ONERILER, payload: yeniOneriler });
  };
  

  const getActiveCampaigns = () => {
    const now = new Date();
    const filtered = state.campaigns.filter(campaign => {
      if (!campaign.aktif) return false;

      const startDate = new Date(campaign.baslangic_tarihi);
      const endDate = campaign.bitis_tarihi ? new Date(campaign.bitis_tarihi) : null;

      return startDate <= now && (!endDate || endDate >= now);
    });

    console.log('Kampanya filtreleme:', {
      toplam: state.campaigns.length,
      aktif: filtered.length
    });

    return filtered.sort((a, b) => a.id - b.id);
  };

  const getActiveAnnouncements = () => {
    const now = new Date();
    const filtered = state.announcements.filter(announcement => {
      if (!announcement.aktif) return false;

      const startDate = new Date(announcement.baslangic_tarihi);
      const endDate = announcement.bitis_tarihi ? new Date(announcement.bitis_tarihi) : null;

      // Geçerli tarih aralığında olanları göster
      const isCurrentlyActive = startDate <= now && (!endDate || endDate >= now);

      // Veya bitiş tarihi null olanları göster (sürekli duyurular)
      const isOngoing = !endDate;

      // Veya bitiş tarihi geçmişte olsa bile başlangıç tarihi bugünden önce olanları göster
      // (tarihsel duyurular için)
      const isHistorical = endDate && endDate < now && startDate <= now;

      const shouldShow = isCurrentlyActive || isOngoing || isHistorical;

      if (!shouldShow) {
        console.log('Filtre dışı duyuru:', {
          id: announcement.id,
          baslik: announcement.baslik,
          startDate: announcement.baslangic_tarihi,
          endDate: announcement.bitis_tarihi,
          now: now.toISOString(),
          neden: isCurrentlyActive ? 'aktif' : isOngoing ? 'sürekli' : isHistorical ? 'tarihsel' : 'diğer'
        });
      }

      return shouldShow;
    });

    console.log('Duyuru filtreleme:', {
      toplam: state.announcements.length,
      aktif: filtered.length
    });

    return filtered.sort((a, b) => {
      // Önce oncelik'e göre sırala (yüksek oncelik önce gelsin)
      if (a.oncelik !== b.oncelik) {
        return (b.oncelik || 0) - (a.oncelik || 0);
      }
      // Aynı oncelik ise id'ye göre sırala
      return a.id - b.id;
    });
  };
  
   const getActiveYeniOneriler = () => {
       const now = new Date();
       return state.yeniOneriler.filter(o =>
         o.aktif &&
         new Date(o.baslangic_tarihi) <= now &&
        (!o.bitis_tarihi || new Date(o.bitis_tarihi) >= now)
       ).sort((a, b) => a.id - b.id);
     };

  const value = {
    ...state,
    setLoading,
    setCurrentOrder,
    setOrderStatus,
    setCampaigns,
    setAnnouncements,
    setCategories,
    setProducts,
    getActiveCampaigns,
    setYeniOneriler,
    getActiveAnnouncements,
    getActiveYeniOneriler,

  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
