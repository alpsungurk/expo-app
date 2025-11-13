import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// Initial state
const initialState = {
  isLoading: false,
  currentOrder: null,
  orderStatus: null,
  activeOrder: null, // Aktif sipariş durumu
  allOrders: [], // Tüm siparişler
  campaigns: [],
  announcements: [],
  yeniOneriler: [],
  categories: [],
  products: [],
  sistemAyarlari: [],
  isProductModalOpen: false, // Product detail modal durumu
  phoneToken: null, // Cihaz kimliği
  user: null, // Kullanıcı bilgisi (auth.users)
  userProfile: null, // Kullanıcı profili (kullanici_profilleri)
};

// Action types
const APP_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CURRENT_ORDER: 'SET_CURRENT_ORDER',
  SET_ORDER_STATUS: 'SET_ORDER_STATUS',
  SET_ACTIVE_ORDER: 'SET_ACTIVE_ORDER',
  SET_ALL_ORDERS: 'SET_ALL_ORDERS',
  SET_CAMPAIGNS: 'SET_CAMPAIGNS',
  SET_ANNOUNCEMENTS: 'SET_ANNOUNCEMENTS',
  SET_YENI_ONERILER: 'SET_YENI_ONERILER',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_PRODUCTS: 'SET_PRODUCTS',
  SET_SISTEM_AYARLARI: 'SET_SISTEM_AYARLARI',
  SET_PRODUCT_MODAL_OPEN: 'SET_PRODUCT_MODAL_OPEN',
  SET_PHONE_TOKEN: 'SET_PHONE_TOKEN',
  SET_USER: 'SET_USER',
  SET_USER_PROFILE: 'SET_USER_PROFILE'
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
    case APP_ACTIONS.SET_ACTIVE_ORDER:
      return { ...state, activeOrder: action.payload };
    case APP_ACTIONS.SET_ALL_ORDERS:
      return { ...state, allOrders: action.payload };
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
    case APP_ACTIONS.SET_SISTEM_AYARLARI:
      return { ...state, sistemAyarlari: action.payload };
    case APP_ACTIONS.SET_PRODUCT_MODAL_OPEN:
      return { ...state, isProductModalOpen: action.payload };
    case APP_ACTIONS.SET_PHONE_TOKEN:
      return { ...state, phoneToken: action.payload };
    case APP_ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    case APP_ACTIONS.SET_USER_PROFILE:
      return { ...state, userProfile: action.payload };
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

  const setActiveOrder = (order) => {
    dispatch({ type: APP_ACTIONS.SET_ACTIVE_ORDER, payload: order });
  };

  const setAllOrders = (orders) => {
    dispatch({ type: APP_ACTIONS.SET_ALL_ORDERS, payload: orders });
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

  const setSistemAyarlari = (sistemAyarlari) => {
    dispatch({ type: APP_ACTIONS.SET_SISTEM_AYARLARI, payload: sistemAyarlari });
  };

  const setProductModalOpen = (isOpen) => {
    dispatch({ type: APP_ACTIONS.SET_PRODUCT_MODAL_OPEN, payload: isOpen });
  };

  const setPhoneToken = (token) => {
    dispatch({ type: APP_ACTIONS.SET_PHONE_TOKEN, payload: token });
  };

  const setUser = (user) => {
    dispatch({ type: APP_ACTIONS.SET_USER, payload: user });
  };

  const setUserProfile = (profile) => {
    dispatch({ type: APP_ACTIONS.SET_USER_PROFILE, payload: profile });
  };

  // Kullanıcı profilini yükle
  const loadUserProfile = useCallback(async (userId) => {
    try {
      if (!userId) {
        console.error('loadUserProfile: userId gerekli');
        return null;
      }

      const { data, error } = await supabase
        .from('kullanici_profilleri')
        .select('*, roller(*)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Kullanıcı profili yükleme hatası:', error);
        return null;
      }

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Kullanıcı profili yükleme hatası:', error);
      return null;
    }
  }, [setUserProfile]);

  // loadUserProfile'ı ref ile sakla (useEffect dependency sorununu önlemek için)
  const loadUserProfileRef = useRef(loadUserProfile);
  useEffect(() => {
    loadUserProfileRef.current = loadUserProfile;
  }, [loadUserProfile]);

  // Phone token'ı yükle
  useEffect(() => {
    const loadPhoneToken = async () => {
      try {
        let token = await AsyncStorage.getItem('phoneToken');
        if (!token) {
          // Benzersiz token oluştur
          token = `PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await AsyncStorage.setItem('phoneToken', token);
        } else {
        }
        setPhoneToken(token);
      } catch (error) {
        console.error('Phone token yükleme hatası:', error);
      }
    };
    loadPhoneToken();
  }, []);

  // Auth state listener
  useEffect(() => {
    let isMounted = true;

    // Mevcut session'ı kontrol et
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      if (session) {
        setUser(session.user);
        const profile = await loadUserProfileRef.current(session.user.id);
        
        // Profil state'ini güncelle
        if (profile) {
          setUserProfile(profile);
        }
        
        // Aktif kontrolü - Pasif kullanıcıları otomatik çıkış yaptır
        if (profile && profile.aktif === false) {
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      }
    });

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change event:', event, session?.user?.email);
      
      if (session) {
        setUser(session.user);
        const profile = await loadUserProfileRef.current(session.user.id);
        
        // Profil state'ini güncelle
        if (profile) {
          setUserProfile(profile);
        }
        
        // Aktif kontrolü - Pasif kullanıcıları otomatik çıkış yaptır
        if (profile && profile.aktif === false) {
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setUserProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Boş dependency array - sadece mount/unmount'ta çalışır
  

  const getActiveCampaigns = () => {
    // Geçici olarak sadece aktif olanları göster (tarih filtrelemesi kaldırıldı)
    const filtered = state.campaigns.filter(campaign => campaign.aktif);
    return filtered.sort((a, b) => a.id - b.id);
  };

  const getActiveAnnouncements = () => {
    // Geçici olarak sadece aktif olanları göster (tarih filtrelemesi kaldırıldı)
    const filtered = state.announcements.filter(announcement => announcement.aktif);
    
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
       // Geçici olarak sadece aktif olanları göster (tarih filtrelemesi kaldırıldı)
       return state.yeniOneriler.filter(o => o.aktif).sort((a, b) => a.id - b.id);
     };

  const getSistemAyarı = (anahtar) => {
    const ayar = state.sistemAyarlari.find(a => a.anahtar === anahtar);
    return ayar ? ayar.deger : null;
  };

  // Aktif sipariş sayısını hesapla (beklemede, hazırlanıyor, hazır)
  const getActiveOrdersCount = () => {
    return state.allOrders.filter(order => 
      ['beklemede', 'hazirlaniyor', 'hazir'].includes(order.durum)
    ).length;
  };

  const value = {
    ...state,
    setLoading,
    setCurrentOrder,
    setOrderStatus,
    setActiveOrder,
    setAllOrders,
    setCampaigns,
    setAnnouncements,
    setCategories,
    setProducts,
    getActiveCampaigns,
    setYeniOneriler,
    getActiveAnnouncements,
    getActiveYeniOneriler,
    setSistemAyarlari,
    getSistemAyarı,
    setProductModalOpen,
    setPhoneToken,
    getActiveOrdersCount,
    setUser,
    setUserProfile,
    loadUserProfile,
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
