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
    return `PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

// Initial state
const initialState = {
  items: [],
  tableId: null,      // Masa ID (masalar tablosundan)
  tableNumber: null,  // Masa numarası (gösterim için)
  phoneToken: null,   // Cihaz kimliği
  selectedGeneralDiscount: null,  // Otomatik seçilen genel indirim (hedef_tipi = 'genel')
  selectedProductDiscounts: {}, // Ürün bazlı seçili indirimler { [productId]: discount }
  availableDiscounts: [], // Kullanılabilir indirimler listesi (genel + ürün bazlı)
  userManuallyRemovedGeneralDiscount: false, // Kullanıcı genel indirimi manuel kaldırdı mı?
  kampanyaUrunleriMap: {}, // kampanya_urunleri tablosundan gelen veriler { [indirim_id]: { urun_ids: [], kategori_ids: [] } }
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
  SET_SELECTED_DISCOUNT: 'SET_SELECTED_DISCOUNT', // Geriye dönük uyumluluk için
  SET_SELECTED_GENERAL_DISCOUNT: 'SET_SELECTED_GENERAL_DISCOUNT',
  SET_SELECTED_PRODUCT_DISCOUNT: 'SET_SELECTED_PRODUCT_DISCOUNT',
  CLEAR_SELECTED_DISCOUNT: 'CLEAR_SELECTED_DISCOUNT', // Geriye dönük uyumluluk için
  CLEAR_SELECTED_PRODUCT_DISCOUNT: 'CLEAR_SELECTED_PRODUCT_DISCOUNT',
  SET_AVAILABLE_DISCOUNTS: 'SET_AVAILABLE_DISCOUNTS',
  SET_KAMPANYA_URUNLERI_MAP: 'SET_KAMPANYA_URUNLERI_MAP',
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
          kategori_id: product.kategori_id || null,
          yeni_urun: product.yeni_urun || false,
          populer: product.populer || false,
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

    case CART_ACTIONS.SET_SELECTED_DISCOUNT:
      // Geriye dönük uyumluluk - sadece genel indirim
      return {
        ...state,
        selectedGeneralDiscount: action.payload?.hedef_tipi === 'genel' ? action.payload : null
      };

    case CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT:
      return {
        ...state,
        selectedGeneralDiscount: action.payload,
        // Eğer indirim null ise (kaldırıldı), flag'i true yap
        // Eğer indirim seçiliyorsa (kullanıcı manuel seçti), flag'i false yap
        userManuallyRemovedGeneralDiscount: action.payload === null
      };

    case CART_ACTIONS.CLEAR_SELECTED_DISCOUNT:
      return {
        ...state,
        selectedGeneralDiscount: null
      };

    case CART_ACTIONS.SET_SELECTED_PRODUCT_DISCOUNT:
      return {
        ...state,
        selectedProductDiscounts: {
          ...state.selectedProductDiscounts,
          [action.payload.productId]: action.payload.discount
        }
      };

    case CART_ACTIONS.CLEAR_SELECTED_PRODUCT_DISCOUNT:
      const { [action.payload.productId]: removed, ...rest } = state.selectedProductDiscounts;
      return {
        ...state,
        selectedProductDiscounts: rest
      };

    case CART_ACTIONS.SET_AVAILABLE_DISCOUNTS:
      return {
        ...state,
        availableDiscounts: action.payload
      };

    case CART_ACTIONS.SET_KAMPANYA_URUNLERI_MAP:
      return {
        ...state,
        kampanyaUrunleriMap: action.payload
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

  // İndirim hesaplama fonksiyonları
  const calculateDiscount = (totalPrice, discount) => {
    if (!discount || !totalPrice || totalPrice <= 0) return 0;

    let discountAmount = 0;

    if (discount.indirim_tipi === 'yuzde') {
      // Yüzde indirim - toplam tutar üzerinden hesapla
      discountAmount = (totalPrice * discount.indirim_degeri) / 100;
    } else if (discount.indirim_tipi === 'miktar') {
      // Sabit miktar indirim
      discountAmount = parseFloat(discount.indirim_degeri) || 0;
      
      // Toplam fiyattan fazla indirim yapılamaz
      if (discountAmount > totalPrice) {
        discountAmount = totalPrice;
      }
    }

    // Negatif olamaz ve toplam fiyattan fazla olamaz
    return Math.max(0, Math.min(discountAmount, totalPrice));
  };

  const getDiscountedPrice = () => {
    const totalPrice = getTotalPrice();
    const discountAmount = getDiscountAmount();
    return Math.max(0, totalPrice - discountAmount);
  };

  const getDiscountAmount = () => {
    const totalPrice = getTotalPrice();
    let totalDiscount = 0;
    
      // Genel indirim (hedef_tipi 'genel' olmalı ve aktif olmalı)
      if (state.selectedGeneralDiscount && 
          state.selectedGeneralDiscount.hedef_tipi === 'genel' &&
          state.selectedGeneralDiscount.aktif !== false && 
          state.selectedGeneralDiscount.aktif !== null && 
          state.selectedGeneralDiscount.aktif !== undefined) {
      
      const genelDiscount = state.selectedGeneralDiscount;
      
      // kampanya_urunleri kontrolü - state'ten al
      const kampanyaUrunleri = state.kampanyaUrunleriMap[genelDiscount.indirim_id];
      
      // Filtreye uyan ürünlerin toplamını hesapla
      let filteredItemsTotal = 0;
      
      state.items.forEach(item => {
        let appliesToItem = false;
        
        // kampanya_urunleri kontrolü - eğer bu indirim için kampanya_urunleri'nde kayıt varsa
        // sadece o kayıtlardaki ürünlere/kategorilere uygulanabilir
        if (kampanyaUrunleri) {
          const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(item.id);
          const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id));
          
          // Eğer ne ürün ne kategori eşleşmiyorsa, bu indirim bu ürüne uygulanamaz
          if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
            // Hem ürün hem kategori belirtilmişse, ikisinden biri eşleşmeli
            if (!urunVar && !kategoriVar) {
              appliesToItem = false;
            } else {
              appliesToItem = true;
            }
          } else if (kampanyaUrunleri.urun_ids.length > 0) {
            // Sadece ürün belirtilmişse, ürün eşleşmeli
            appliesToItem = urunVar;
          } else if (kampanyaUrunleri.kategori_ids.length > 0) {
            // Sadece kategori belirtilmişse, kategori eşleşmeli
            appliesToItem = kategoriVar;
          } else {
            // Hiçbir şey belirtilmemişse, tüm ürünlere uygulanabilir
            appliesToItem = true;
          }
        } else {
          // kampanya_urunleri'nde kayıt yoksa, indirimler tablosundaki filtreye göre kontrol et
          
          // Ürün bazlı filtre
          if (genelDiscount.urun_filtre_tipi === 'urun' && genelDiscount.urun_id === item.id) {
            appliesToItem = true;
          }
          // Kategori bazlı filtre
          else if (genelDiscount.urun_filtre_tipi === 'kategori' && genelDiscount.kategori_id === item.kategori_id) {
            appliesToItem = true;
          }
          // Yeni ürün filtre
          else if (genelDiscount.urun_filtre_tipi === 'yeni_urun' && item.yeni_urun === true) {
            appliesToItem = true;
          }
          // Popüler ürün filtre
          else if (genelDiscount.urun_filtre_tipi === 'populer_urun' && item.populer === true) {
            appliesToItem = true;
          }
          // urun_filtre_tipi yoksa tüm ürünlere uygulanabilir
          else if (!genelDiscount.urun_filtre_tipi) {
            appliesToItem = true;
          }
        }
        
        if (appliesToItem) {
          filteredItemsTotal += item.price * item.quantity;
        }
      });
      
      // Sadece filtrelenmiş ürünlere indirim uygula
      if (filteredItemsTotal > 0) {
        const genelDiscountAmount = calculateDiscount(filteredItemsTotal, genelDiscount);
        totalDiscount += genelDiscountAmount;
      }
    }
    
    // Ürün bazlı indirimler
    Object.keys(state.selectedProductDiscounts).forEach(productId => {
      const discount = state.selectedProductDiscounts[productId];
      const item = state.items.find(item => item.id === parseInt(productId));
      
      if (item && discount && 
          discount.aktif !== false && 
          discount.aktif !== null && 
          discount.aktif !== undefined) {
        
        // İndirimin bu ürüne uygulanıp uygulanmayacağını kontrol et
        let appliesToItem = false;
        
        // kampanya_urunleri kontrolü - eğer bu indirim için kampanya_urunleri'nde kayıt varsa
        // sadece o kayıtlardaki ürünlere/kategorilere uygulanabilir
        const kampanyaUrunleri = state.kampanyaUrunleriMap[discount.indirim_id];
        if (kampanyaUrunleri) {
          const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(item.id);
          const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id));
          
          // Eğer ne ürün ne kategori eşleşmiyorsa, bu indirim bu ürüne uygulanamaz
          if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
            // Hem ürün hem kategori belirtilmişse, ikisinden biri eşleşmeli
            appliesToItem = urunVar || kategoriVar;
          } else if (kampanyaUrunleri.urun_ids.length > 0) {
            // Sadece ürün belirtilmişse, ürün eşleşmeli
            appliesToItem = urunVar;
          } else if (kampanyaUrunleri.kategori_ids.length > 0) {
            // Sadece kategori belirtilmişse, kategori eşleşmeli
            appliesToItem = kategoriVar;
          } else {
            // Hiçbir şey belirtilmemişse, tüm ürünlere uygulanabilir
            appliesToItem = true;
          }
        } else {
          // kampanya_urunleri'nde kayıt yoksa, indirimler tablosundaki filtreye göre kontrol et
          
          // Ürün bazlı indirim
          if (discount.urun_filtre_tipi === 'urun' && discount.urun_id === item.id) {
            appliesToItem = true;
          }
          // Kategori bazlı indirim
          else if (discount.urun_filtre_tipi === 'kategori' && discount.kategori_id === item.kategori_id) {
            appliesToItem = true;
          }
          // Yeni ürün indirimi
          else if (discount.urun_filtre_tipi === 'yeni_urun' && item.yeni_urun === true) {
            appliesToItem = true;
          }
          // Popüler ürün indirimi
          else if (discount.urun_filtre_tipi === 'populer_urun' && item.populer === true) {
            appliesToItem = true;
          }
          // Eğer urun_filtre_tipi yoksa veya belirtilmemişse, sadece productId eşleşmesi yeterli
          else if (!discount.urun_filtre_tipi) {
            appliesToItem = true;
          }
        }
        
        if (appliesToItem) {
          const itemTotal = item.price * item.quantity;
          const itemDiscount = calculateDiscount(itemTotal, discount);
          totalDiscount += itemDiscount;
        }
      }
    });
    
    // Toplam indirim toplam fiyattan fazla olamaz
    return Math.min(totalDiscount, totalPrice);
  };

  // Kullanılabilir indirimleri getir
  const loadAvailableDiscounts = async (userId = null, totalPrice = 0) => {
    try {
      // Sepetteki ürün ID'lerini ve kategori ID'lerini topla
      const urunIds = state.items.length > 0 
        ? state.items.map(item => item.id).filter(id => id != null)
        : null;
      
      // Kategori ID'leri şimdilik null (ürünler sepete eklenirken kategori_id saklanmıyor)
      // İleride gerekirse sepete eklenirken kategori_id de saklanabilir
      const kategoriIds = null;

      // Eğer Supabase'de kullanici_indirimleri_getir fonksiyonu varsa onu kullan
      try {
        const rpcParams = {
          p_kullanici_id: userId,
          p_toplam_tutar: totalPrice,
        };
        
        // Ürün ve kategori ID'lerini ekle (eğer varsa)
        if (urunIds && urunIds.length > 0) {
          rpcParams.p_urun_ids = urunIds;
        }
        if (kategoriIds && kategoriIds.length > 0) {
          rpcParams.p_kategori_ids = kategoriIds;
        }

        const { data, error } = await supabase.rpc('kullanici_indirimleri_getir', rpcParams);
        
        // Kullanıcı bilgilerini al (kişi bazlı indirim filtreleri için created_at de gerekli)
        let kayitIndirimiKullanildi = false;
        let kullaniciKayitTarihiRPC = null;
        
        if (userId) {
          const { data: kullaniciProfili } = await supabase
            .from('kullanici_profilleri')
            .select('kayit_indirimi_kullanildi, created_at')
            .eq('id', userId)
            .maybeSingle();
          
          if (kullaniciProfili) {
            kayitIndirimiKullanildi = kullaniciProfili.kayit_indirimi_kullanildi || false;
            if (kullaniciProfili.created_at) {
              kullaniciKayitTarihiRPC = new Date(kullaniciProfili.created_at);
            }
          }
          
          // Kişi bazlı indirimler için sipariş sayısı kontrolü kaldırıldı
          // Artık sadece kullanıcı giriş kontrolü yapılıyor
          
          dispatch({
            type: CART_ACTIONS.SET_USER_INFO,
            payload: {
              userId: userId,
              kayitIndirimiKullanildi: kayitIndirimiKullanildi
            }
          });
        } else {
          // Kullanıcı giriş yapmamışsa, kişi bazlı indirimler gösterilmemeli
          // Telefon token ile sipariş sayısı kontrolü artık yapılmıyor
          // Çünkü kişi bazlı indirimler sadece giriş yapmış kullanıcılara uygulanacak
          
          dispatch({
            type: CART_ACTIONS.SET_USER_INFO,
            payload: {
              userId: null,
              kayitIndirimiKullanildi: false
            }
          });
        }
        
        // RPC başarılı ve veri varsa işle (boş array değilse)
        if (!error && data && Array.isArray(data) && data.length > 0) {
          // kampanya_urunleri tablosunu sorgula
          const { data: kampanyaUrunleriData } = await supabase
            .from('kampanya_urunleri')
            .select('indirim_id, urun_id, kategori_id');
          
          // İndirim ID'lerine göre kampanya_urunleri'ni grupla
          const indirimUrunleriMap = {};
          if (kampanyaUrunleriData) {
            kampanyaUrunleriData.forEach(ku => {
              if (ku.indirim_id) {
                if (!indirimUrunleriMap[ku.indirim_id]) {
                  indirimUrunleriMap[ku.indirim_id] = {
                    urun_ids: [],
                    kategori_ids: []
                  };
                }
                if (ku.urun_id) {
                  indirimUrunleriMap[ku.indirim_id].urun_ids.push(ku.urun_id);
                }
                if (ku.kategori_id) {
                  indirimUrunleriMap[ku.indirim_id].kategori_ids.push(ku.kategori_id);
                }
              }
            });
          }
          
          // State'e kaydet
          dispatch({
            type: CART_ACTIONS.SET_KAMPANYA_URUNLERI_MAP,
            payload: indirimUrunleriMap
          });
          
          // RPC fonksiyonu artık tüm filtrelemeyi backend'de yapıyor
          // (kişi bazlı indirimler için filtre kontrolü, authenticated kullanıcı kontrolü, vb.)
          // Bu yüzden frontend'de ekstra filtreleme yapmaya gerek yok
          const filteredData = data; // RPC zaten filtrelenmiş veri döndürüyor
          
          // Genel indirimleri filtrele (hedef_tipi 'genel' olanlar)
          // kampanya_urunleri kontrolü yap - eğer belirli ürünler/kategoriler için tanımlıysa
          // ve sepette o ürünler/kategoriler yoksa, indirim gösterilmemeli
          const genelIndirimler = filteredData
            .filter(d => {
              if (d.hedef_tipi !== 'genel') {
                return false;
              }
              
              // kampanya_urunleri kontrolü
              const kampanyaUrunleri = indirimUrunleriMap[d.indirim_id];
              if (kampanyaUrunleri) {
                // Eğer kampanya_urunleri'nde belirli ürünler/kategoriler varsa
                // sepette o ürünler/kategoriler olmalı
                if (kampanyaUrunleri.urun_ids.length > 0) {
                  // Belirli ürünler için tanımlı - sepette bu ürünlerden biri olmalı
                  const sepetteUrunVar = state.items.some(item => 
                    kampanyaUrunleri.urun_ids.includes(item.id)
                  );
                  if (!sepetteUrunVar) {
                    return false; // Sepette ilgili ürün yok, indirim gösterilmemeli
                  }
                }
                
                if (kampanyaUrunleri.kategori_ids.length > 0) {
                  // Belirli kategoriler için tanımlı - sepette bu kategorilerden birinde ürün olmalı
                  const sepetteKategoriVar = state.items.some(item => 
                    item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id)
                  );
                  if (!sepetteKategoriVar) {
                    return false; // Sepette ilgili kategoride ürün yok, indirim gösterilmemeli
                  }
                }
              }
              
              return true;
            })
            .map(d => ({
              ...d,
              aktif: true // RPC zaten aktif kontrolü yapıyor
            }));
          
          // Genel indirimleri uygulanabilir indirim miktarına göre sırala
          const sortedGenelIndirimler = [...genelIndirimler].sort((a, b) => {
            const aAmount = parseFloat(a.uygulanabilir_indirim) || 0;
            const bAmount = parseFloat(b.uygulanabilir_indirim) || 0;
            return bAmount - aAmount;
          });
          
          // Seçili indirimin hala geçerli olup olmadığını kontrol et
          if (state.userManuallyRemovedGeneralDiscount && state.selectedGeneralDiscount) {
            dispatch({
              type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
              payload: null
            });
          } else if (state.selectedGeneralDiscount) {
            const seciliIndirimHalaGecerli = sortedGenelIndirimler.some(
              d => d.indirim_id === state.selectedGeneralDiscount.indirim_id
            );
            if (!seciliIndirimHalaGecerli) {
              dispatch({
                type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
                payload: null
              });
            }
          }
          
          // En iyi genel indirimi otomatik seç (eğer seçili indirim yoksa ve kullanıcı manuel kaldırmadıysa)
          if (totalPrice > 0 && sortedGenelIndirimler.length > 0 && !state.userManuallyRemovedGeneralDiscount) {
            const seciliIndirimVar = state.selectedGeneralDiscount;
            const seciliIndirimGecerli = seciliIndirimVar && sortedGenelIndirimler.some(
              d => d.indirim_id === state.selectedGeneralDiscount?.indirim_id
            );
            
            if (!seciliIndirimGecerli) {
              const enIyiIndirim = sortedGenelIndirimler[0];
              dispatch({
                type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
                payload: enIyiIndirim
              });
            }
          }
          
          // Her ürün için geçerli indirimleri bul (ürün bazlı, kategori bazlı, popüler, yeni - genel hariç)
          // Genel indirimler zaten sortedGenelIndirimler'de ve genel olarak uygulanıyor
          // Her ürün için ayrı ayrı indirimler ekle (aynı indirim farklı ürünler için farklı kayıtlar olabilir)
          const allProductDiscounts = [];
          
          state.items.forEach(item => {
            const itemDiscounts = filteredData.filter(d => {
              // kampanya_urunleri kontrolü - eğer bu indirim için kampanya_urunleri'nde kayıt varsa
              // sadece o kayıtlardaki ürünlere/kategorilere uygulanabilir
              const kampanyaUrunleri = indirimUrunleriMap[d.indirim_id];
              if (kampanyaUrunleri) {
                // kampanya_urunleri'nde bu ürün veya kategori var mı kontrol et
                const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(item.id);
                const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id));
                
                // Eğer ne ürün ne kategori eşleşmiyorsa, bu indirim bu ürüne uygulanamaz
                if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
                  // Hem ürün hem kategori belirtilmişse, ikisinden biri eşleşmeli
                  if (!urunVar && !kategoriVar) {
                    return false;
                  }
                } else if (kampanyaUrunleri.urun_ids.length > 0) {
                  // Sadece ürün belirtilmişse, ürün eşleşmeli
                  if (!urunVar) {
                    return false;
                  }
                } else if (kampanyaUrunleri.kategori_ids.length > 0) {
                  // Sadece kategori belirtilmişse, kategori eşleşmeli
                  if (!kategoriVar) {
                    return false;
                  }
                }
              }
              
              // Genel indirimleri atla (onlar zaten genel olarak uygulanıyor)
              if (d.hedef_tipi === 'genel' && !d.urun_filtre_tipi) {
                return false;
              }
              
              // Ürün bazlı indirim - sadece bu ürüne özel
              if (d.urun_filtre_tipi === 'urun' && d.urun_id === item.id) {
                return true;
              }
              
              // Kategori bazlı indirim - bu kategorideki ürünlere uygulanabilir
              if (d.urun_filtre_tipi === 'kategori' && d.kategori_id === item.kategori_id) {
                return true;
              }
              
              // Yeni ürün indirimi - yeni ürünlere uygulanabilir
              if (d.urun_filtre_tipi === 'yeni_urun' && item.yeni_urun === true) {
                return true;
              }
              
              // Popüler ürün indirimi - popüler ürünlere uygulanabilir
              if (d.urun_filtre_tipi === 'populer_urun' && item.populer === true) {
                return true;
              }
              
              return false;
            });
            
            // Her ürün için geçerli indirimleri, o ürün için özel olarak ekle
            allProductDiscounts.push(...itemDiscounts.map(d => ({
              ...d,
              aktif: true,
              urun_id: item.id, // Hangi ürün için geçerli olduğunu belirt (bu ürün için seçilebilir)
            })));
          });
          
          // Duplicate'leri temizle (indirim_id + urun_id kombinasyonuna göre)
          // Aynı indirim aynı ürün için birden fazla kez eklenmemeli
          const uniqueProductDiscounts = [];
          const uniqueDiscountKeys = new Set();
          allProductDiscounts.forEach(d => {
            const key = `${d.indirim_id}_${d.urun_id}`;
            if (!uniqueDiscountKeys.has(key)) {
              uniqueDiscountKeys.add(key);
              uniqueProductDiscounts.push(d);
            }
          });
          
          // Her ürün için eğer sadece 1 indirim varsa otomatik seç
          state.items.forEach(item => {
            const itemApplicableDiscounts = uniqueProductDiscounts.filter(
              d => d.urun_id === item.id
            );
            
            // Eğer bu ürün için seçili indirim yoksa ve sadece 1 indirim varsa otomatik seç
            if (!state.selectedProductDiscounts[item.id.toString()] && itemApplicableDiscounts.length === 1) {
              const autoDiscount = itemApplicableDiscounts[0];
              dispatch({
                type: CART_ACTIONS.SET_SELECTED_PRODUCT_DISCOUNT,
                payload: { productId: item.id.toString(), discount: autoDiscount }
              });
            }
          });

          // availableDiscounts listesine hem genel hem ürün bazlı indirimleri ekle
          // Duplicate kontrolü: Aynı indirim_id'ye sahip indirimleri temizle
          const allDiscountsForList = [...sortedGenelIndirimler, ...uniqueProductDiscounts];
          const finalDiscounts = [];
          const seenIndirimIds = new Set();
          
          allDiscountsForList.forEach(d => {
            // Eğer bu indirim_id daha önce görülmediyse ekle
            if (!seenIndirimIds.has(d.indirim_id)) {
              seenIndirimIds.add(d.indirim_id);
              finalDiscounts.push(d);
            }
          });
          
          dispatch({
            type: CART_ACTIONS.SET_AVAILABLE_DISCOUNTS,
            payload: finalDiscounts
          });
          return sortedGenelIndirimler;
        }
      } catch (rpcError) {
      }

      // RPC fonksiyonu yoksa, hata varsa veya boş döndüyse, direkt tablodan çek
      const { data: discountsData, error: discountsError } = await supabase
        .from('indirimler')
        .select(`
          *,
          kampanyalar (
            id,
            ad,
            baslangic_tarihi,
            bitis_tarihi,
            aktif
          )
        `)
        .eq('aktif', true);

      if (discountsError) {
        return [];
      }

      // kampanya_urunleri tablosunu sorgula
      const { data: kampanyaUrunleriData } = await supabase
        .from('kampanya_urunleri')
        .select('indirim_id, urun_id, kategori_id');
      
      // İndirim ID'lerine göre kampanya_urunleri'ni grupla
      const indirimUrunleriMap = {};
      if (kampanyaUrunleriData) {
        kampanyaUrunleriData.forEach(ku => {
          if (ku.indirim_id) {
            if (!indirimUrunleriMap[ku.indirim_id]) {
              indirimUrunleriMap[ku.indirim_id] = {
                urun_ids: [],
                kategori_ids: []
              };
            }
            if (ku.urun_id) {
              indirimUrunleriMap[ku.indirim_id].urun_ids.push(ku.urun_id);
            }
            if (ku.kategori_id) {
              indirimUrunleriMap[ku.indirim_id].kategori_ids.push(ku.kategori_id);
            }
          }
        });
      }
      
      // State'e kaydet
      dispatch({
        type: CART_ACTIONS.SET_KAMPANYA_URUNLERI_MAP,
        payload: indirimUrunleriMap
      });

      // Kullanıcının daha önce kullandığı indirimleri kontrol et (tek kullanımlık için)
      let kullaniciIndirimKullanimlari = [];
      
      if (userId) {
        const { data: kullanimData } = await supabase
          .from('kullanici_indirim_kullanimlari')
          .select('indirim_id')
          .eq('kullanici_id', userId);
        
        if (kullanimData) {
          kullaniciIndirimKullanimlari = kullanimData.map(k => k.indirim_id);
        }
      }

      // Filtrele: Aktif kampanyalar ve tarih kontrolü - Tüm indirimler (genel + ürün bazlı)
      const now = new Date();
      
      const allDiscounts = (discountsData || []).filter(discount => {
        const campaign = discount.kampanyalar;
        if (!campaign || !campaign.aktif) {
          return false;
        }
        
        const startDate = new Date(campaign.baslangic_tarihi);
        const endDate = new Date(campaign.bitis_tarihi);
        
        if (now < startDate || now > endDate) {
          return false;
        }
        
        // Aktif kontrolü - pasif indirimler uygulanmaz
        if (discount.aktif === false || discount.aktif === null || discount.aktif === undefined) {
          return false;
        }
        
        // Kullanıcı başına limit kontrolü
        const kullaniciBasinaLimit = discount.kullanici_basina_limit;
        if (kullaniciBasinaLimit !== null && kullaniciBasinaLimit !== undefined && kullaniciBasinaLimit > 0) {
          if (!userId) {
            return false;
          }
          const kullanimSayisi = kullaniciIndirimKullanimlari.filter(id => id === discount.id).length;
          if (kullanimSayisi >= kullaniciBasinaLimit) {
            return false;
          }
        }
        
        return true;
      });

      // Sadece genel indirimler ve aktif olanlar
      // kampanya_urunleri kontrolü yap - eğer belirli ürünler/kategoriler için tanımlıysa
      // ve sepette o ürünler/kategoriler yoksa, indirim gösterilmemeli
      const genelIndirimler = allDiscounts
        .filter(discount => {
          if (discount.hedef_tipi !== 'genel') {
            return false;
          }
          
          // Aktif kontrolü
          if (discount.aktif === false || discount.aktif === null || discount.aktif === undefined) {
            return false;
          }
          
          // kampanya_urunleri kontrolü
          const kampanyaUrunleri = indirimUrunleriMap[discount.id];
          if (kampanyaUrunleri) {
            // Eğer kampanya_urunleri'nde belirli ürünler/kategoriler varsa
            // sepette o ürünler/kategoriler olmalı
            if (kampanyaUrunleri.urun_ids.length > 0) {
              // Belirli ürünler için tanımlı - sepette bu ürünlerden biri olmalı
              const sepetteUrunVar = state.items.some(item => 
                kampanyaUrunleri.urun_ids.includes(item.id)
              );
              if (!sepetteUrunVar) {
                return false; // Sepette ilgili ürün yok, indirim gösterilmemeli
              }
            }
            
            if (kampanyaUrunleri.kategori_ids.length > 0) {
              // Belirli kategoriler için tanımlı - sepette bu kategorilerden birinde ürün olmalı
              const sepetteKategoriVar = state.items.some(item => 
                item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id)
              );
              if (!sepetteKategoriVar) {
                return false; // Sepette ilgili kategoride ürün yok, indirim gösterilmemeli
              }
            }
          }
          
          return true;
        })
        .map(discount => ({
          indirim_id: discount.id,
          kampanya_adi: discount.kampanyalar?.ad || 'İndirim',
          indirim_tipi: discount.indirim_tipi,
          indirim_degeri: parseFloat(discount.indirim_degeri),
          hedef_tipi: discount.hedef_tipi || 'genel',
          urun_filtre_tipi: discount.urun_filtre_tipi,
          urun_id: discount.urun_id,
          kategori_id: discount.kategori_id,
          aktif: discount.aktif,
          uygulanabilir_indirim: calculateDiscount(totalPrice, {
            indirim_tipi: discount.indirim_tipi,
            indirim_degeri: parseFloat(discount.indirim_degeri),
          }),
        }));
      
      // Genel indirimleri uygulanabilir indirim miktarına göre sırala
      const sortedGenelIndirimler = [...genelIndirimler].sort((a, b) => {
        const aAmount = parseFloat(a.uygulanabilir_indirim) || 0;
        const bAmount = parseFloat(b.uygulanabilir_indirim) || 0;
        return bAmount - aAmount;
      });
      
      // Seçili indirimin hala geçerli olup olmadığını kontrol et
      if (state.userManuallyRemovedGeneralDiscount && state.selectedGeneralDiscount) {
        dispatch({
          type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
          payload: null
        });
      } else if (state.selectedGeneralDiscount) {
        const seciliIndirimHalaGecerli = sortedGenelIndirimler.some(
          d => d.indirim_id === state.selectedGeneralDiscount.indirim_id
        );
        if (!seciliIndirimHalaGecerli) {
          dispatch({
            type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
            payload: null
          });
        }
      }
      
      // En iyi genel indirimi otomatik seç (eğer seçili indirim yoksa ve kullanıcı manuel kaldırmadıysa)
      if (totalPrice > 0 && sortedGenelIndirimler.length > 0 && !state.userManuallyRemovedGeneralDiscount) {
        const seciliIndirimVar = state.selectedGeneralDiscount;
        const seciliIndirimGecerli = seciliIndirimVar && sortedGenelIndirimler.some(
          d => d.indirim_id === state.selectedGeneralDiscount?.indirim_id
        );
        
        if (!seciliIndirimGecerli) {
          const enIyiIndirim = sortedGenelIndirimler[0];
          dispatch({
            type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
            payload: enIyiIndirim
          });
        }
      }

      // Ürün bazlı indirimleri de ekle (direkt tablo sorgusunda)
      // Her ürün için geçerli indirimleri bul (ürün bazlı, kategori bazlı, popüler, yeni - genel hariç)
      const allProductDiscounts = [];
      
      state.items.forEach(item => {
        const itemDiscounts = allDiscounts.filter(d => {
          // Genel indirimleri atla (onlar zaten genel olarak uygulanıyor)
          if (d.hedef_tipi === 'genel' && !d.urun_filtre_tipi) {
            return false;
          }
          
          // kampanya_urunleri kontrolü - eğer bu indirim için kampanya_urunleri'nde kayıt varsa
          // sadece o kayıtlardaki ürünlere/kategorilere uygulanabilir
          const kampanyaUrunleri = indirimUrunleriMap[d.id];
          if (kampanyaUrunleri) {
            const urunVar = kampanyaUrunleri.urun_ids.length === 0 || kampanyaUrunleri.urun_ids.includes(item.id);
            const kategoriVar = kampanyaUrunleri.kategori_ids.length === 0 || (item.kategori_id && kampanyaUrunleri.kategori_ids.includes(item.kategori_id));
            
            // Eğer ne ürün ne kategori eşleşmiyorsa, bu indirim bu ürüne uygulanamaz
            if (kampanyaUrunleri.urun_ids.length > 0 && kampanyaUrunleri.kategori_ids.length > 0) {
              // Hem ürün hem kategori belirtilmişse, ikisinden biri eşleşmeli
              if (!urunVar && !kategoriVar) {
                return false;
              }
            } else if (kampanyaUrunleri.urun_ids.length > 0) {
              // Sadece ürün belirtilmişse, ürün eşleşmeli
              if (!urunVar) {
                return false;
              }
            } else if (kampanyaUrunleri.kategori_ids.length > 0) {
              // Sadece kategori belirtilmişse, kategori eşleşmeli
              if (!kategoriVar) {
                return false;
              }
            }
          }
          
          // Ürün bazlı indirim
          if (d.urun_filtre_tipi === 'urun' && d.urun_id === item.id) {
            return true;
          }
          
          // Kategori bazlı indirim
          if (d.urun_filtre_tipi === 'kategori' && d.kategori_id === item.kategori_id) {
            return true;
          }
          
          // Yeni ürün indirimi
          if (d.urun_filtre_tipi === 'yeni_urun' && item.yeni_urun === true) {
            return true;
          }
          
          // Popüler ürün indirimi
          if (d.urun_filtre_tipi === 'populer_urun' && item.populer === true) {
            return true;
          }
          
          return false;
        });
        
        // Her ürün için geçerli indirimleri, o ürün için özel olarak ekle
        allProductDiscounts.push(...itemDiscounts.map(d => ({
          indirim_id: d.id,
          kampanya_adi: d.kampanyalar?.ad || 'İndirim',
          indirim_tipi: d.indirim_tipi,
          indirim_degeri: parseFloat(d.indirim_degeri),
          hedef_tipi: d.hedef_tipi || 'genel',
          urun_filtre_tipi: d.urun_filtre_tipi,
          urun_id: item.id, // Hangi ürün için geçerli olduğunu belirt
          kategori_id: d.kategori_id,
          aktif: d.aktif,
          uygulanabilir_indirim: calculateDiscount(item.price * item.quantity, {
            indirim_tipi: d.indirim_tipi,
            indirim_degeri: parseFloat(d.indirim_degeri),
          }),
        })));
      });
      
      // Duplicate'leri temizle (indirim_id + urun_id kombinasyonuna göre)
      const uniqueProductDiscounts = [];
      const uniqueDiscountKeys = new Set();
      allProductDiscounts.forEach(d => {
        const key = `${d.indirim_id}_${d.urun_id}`;
        if (!uniqueDiscountKeys.has(key)) {
          uniqueDiscountKeys.add(key);
          uniqueProductDiscounts.push(d);
        }
      });
      
      // Her ürün için eğer sadece 1 indirim varsa otomatik seç
      state.items.forEach(item => {
        const itemApplicableDiscounts = uniqueProductDiscounts.filter(
          d => d.urun_id === item.id
        );
        
        // Eğer bu ürün için seçili indirim yoksa ve sadece 1 indirim varsa otomatik seç
        if (!state.selectedProductDiscounts[item.id.toString()] && itemApplicableDiscounts.length === 1) {
          const autoDiscount = itemApplicableDiscounts[0];
          dispatch({
            type: CART_ACTIONS.SET_SELECTED_PRODUCT_DISCOUNT,
            payload: { productId: item.id.toString(), discount: autoDiscount }
          });
        }
      });

      // availableDiscounts listesine hem genel hem ürün bazlı indirimleri ekle
      // Duplicate kontrolü: Aynı indirim_id'ye sahip indirimleri temizle
      const allDiscountsForList = [...sortedGenelIndirimler, ...uniqueProductDiscounts];
      const finalDiscounts = [];
      const seenIndirimIds = new Set();
      
      allDiscountsForList.forEach(d => {
        // Eğer bu indirim_id daha önce görülmediyse ekle
        if (!seenIndirimIds.has(d.indirim_id)) {
          seenIndirimIds.add(d.indirim_id);
          finalDiscounts.push(d);
        }
      });
      
      dispatch({
        type: CART_ACTIONS.SET_AVAILABLE_DISCOUNTS,
        payload: finalDiscounts
      });

      return sortedGenelIndirimler;
    } catch (error) {
      return [];
    }
  };

  // İndirim koduna göre indirim getir
  const getDiscountByCode = async (code, userId = null, totalPrice = 0) => {
    try {
      // Sepetteki ürün ID'lerini ve kategori ID'lerini topla
      const urunIds = state.items.length > 0 
        ? state.items.map(item => item.id).filter(id => id != null)
        : null;
      
      // Kategori ID'leri şimdilik null (ürünler sepete eklenirken kategori_id saklanmıyor)
      // İleride gerekirse sepete eklenirken kategori_id de saklanabilir
      const kategoriIds = null;

      // Eğer Supabase'de indirim_kod_ile_getir fonksiyonu varsa onu kullan
      try {
        const rpcParams = {
          p_kod: code,
          p_kullanici_id: userId,
          p_toplam_tutar: totalPrice,
        };
        
        // Ürün ve kategori ID'lerini ekle (eğer varsa)
        if (urunIds && urunIds.length > 0) {
          rpcParams.p_urun_ids = urunIds;
        }
        if (kategoriIds && kategoriIds.length > 0) {
          rpcParams.p_kategori_ids = kategoriIds;
        }

        const { data, error } = await supabase.rpc('indirim_kod_ile_getir', rpcParams);
        
        if (!error && data && data.length > 0) {
          const discount = data[0];
          dispatch({
            type: CART_ACTIONS.SET_SELECTED_DISCOUNT,
            payload: discount
          });
          return discount;
        }
      } catch (rpcError) {
      }

      // Kod kolonu kaldırıldığı için artık kod ile indirim arama desteklenmiyor
      // RPC fonksiyonu yoksa veya hata varsa, null döndür
      return null;
    } catch (error) {
      return null;
    }
  };

  const setSelectedDiscount = (discount) => {
    // Geriye dönük uyumluluk - sadece genel indirim
    if (!discount) {
      dispatch({
        type: CART_ACTIONS.CLEAR_SELECTED_DISCOUNT
      });
    } else if (discount.hedef_tipi === 'genel') {
      dispatch({
        type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
        payload: discount
      });
    }
  };

  const setSelectedGeneralDiscount = (discount) => {
    dispatch({
      type: CART_ACTIONS.SET_SELECTED_GENERAL_DISCOUNT,
      payload: discount
    });
  };

  const clearSelectedDiscount = () => {
    dispatch({
      type: CART_ACTIONS.CLEAR_SELECTED_DISCOUNT
    });
  };

  const setSelectedProductDiscount = (productId, discount) => {
    dispatch({
      type: CART_ACTIONS.SET_SELECTED_PRODUCT_DISCOUNT,
      payload: { productId, discount }
    });
  };

  const clearSelectedProductDiscount = (productId) => {
    dispatch({
      type: CART_ACTIONS.CLEAR_SELECTED_PRODUCT_DISCOUNT,
      payload: { productId }
    });
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
      // Toplam tutarı hesapla
      const finalSubtotal = parseFloat(getTotalPrice()) || 0;
      const finalDiscountAmount = parseFloat(getDiscountAmount()) || 0;

      // Sipariş numarası oluştur
      const generateOrderNumber = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SIP${timestamp}${random}`;
      };

      const orderNumber = generateOrderNumber();
      const subtotal = finalSubtotal; // Ara toplam (indirim öncesi)
      const discountAmount = finalDiscountAmount; // İndirim miktarı (limit kontrolünden sonra)
      const totalAmount = Math.max(0, finalSubtotal - finalDiscountAmount); // İndirimli toplam (ara toplam - indirim)

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
            }
          }
        } catch (e) {
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
          }
        }

        // 4. Eğer hala bulunamadıysa ve expo push token varsa, push token'ı kaydet
        if (!pushTokenId && expoPushToken) {
          try {
            
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
            } else {
            }
          } catch (saveError) {
          }
        }

        if (!pushTokenId) {
        }
      } catch (error) {
        // Hata olsa bile sipariş oluşturulmaya devam eder
      }

      // Kullanıcı ID'sini al (eğer giriş yapılmışsa)
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch (error) {
      }

      // Sipariş oluştur - toplam_tutar mutlaka indirimli fiyat olmalı
      const finalTotalAmount = parseFloat(totalAmount.toFixed(2)); // Virgülden sonra 2 basamak
      
      const { data: orderData, error: orderError } = await supabase
        .from(TABLES.SIPARISLER)
        .insert({
          masa_id: state.tableId,
          siparis_no: orderNumber,
          toplam_tutar: finalTotalAmount, // İndirimli toplam (ara toplam - toplam indirim)
          durum: 'beklemede',
          aciklama: null, // İndirim bilgisi aciklama alanına yazılmıyor
          telefon_token: phoneToken,
          push_token_id: pushTokenId,
          kullanici_id: userId // Giriş yapmış kullanıcılar için kullanıcı ID'si
        })
        .select()
        .single();
      
      // Kaydedilen değeri kontrol et
      if (!orderData) {
        throw new Error('Sipariş oluşturulamadı');
      }

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

      // ÖNEMLİ: Trigger sipariş detayları eklendikten sonra toplam_tutar'ı güncelliyor
      // Bu yüzden indirimli toplam_tutar'ı tekrar güncellememiz gerekiyor
      // Trigger'ın güncellediği değer indirim öncesi toplam (sipariş detayları toplamı)
      // Biz indirimli toplamı tekrar yazıyoruz
      // NOT: Trigger her zaman çalıştığı için her zaman güncelleme yapmalıyız
      // Kısa bir gecikme ekleyerek trigger'ın tamamlanmasını bekliyoruz
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { error: updateError } = await supabase
        .from(TABLES.SIPARISLER)
        .update({ toplam_tutar: finalTotalAmount })
        .eq('id', orderData.id);
      
      // Güncellenmiş sipariş verisini al
      const { data: updatedOrder } = await supabase
        .from(TABLES.SIPARISLER)
        .select()
        .eq('id', orderData.id)
        .single();
      
      if (updatedOrder) {
        const savedTotal = parseFloat(updatedOrder.toplam_tutar) || 0;
        orderData.toplam_tutar = savedTotal;
      } else {
        // Eğer güncellenmiş veri alınamazsa, hesaplanan değeri kullan
        orderData.toplam_tutar = finalTotalAmount;
      }

      // İndirim kullanımını kaydet (eğer indirim varsa ve kullanıcı giriş yapmışsa)
      if (userId && discountAmount > 0) {
        // Genel indirim kullanımını kaydet
        if (state.selectedGeneralDiscount) {
          try {
            const genelIndirimMiktari = calculateDiscount(subtotal, state.selectedGeneralDiscount);
            try {
              await supabase.rpc('indirim_kullan', {
                p_indirim_id: state.selectedGeneralDiscount.indirim_id,
                p_kullanici_id: userId,
                p_siparis_id: orderData.id,
                p_kullanilan_tutar: subtotal,
                p_indirim_miktari: genelIndirimMiktari,
              });
            } catch (rpcError) {
              try {
                await supabase
                  .from('kullanici_indirim_kullanimlari')
                  .insert({
                    indirim_id: state.selectedGeneralDiscount.indirim_id,
                    kullanici_id: userId,
                    siparis_id: orderData.id,
                    kullanilan_tutar: subtotal,
                    indirim_miktari: genelIndirimMiktari,
                    kullanma_tarihi: new Date().toISOString(),
                  });
              } catch (insertError) {
              }
            }
          } catch (error) {
          }
        }
        
        // Ürün bazlı indirim kullanımlarını kaydet
        Object.keys(state.selectedProductDiscounts).forEach(productId => {
          const discount = state.selectedProductDiscounts[productId];
          const item = state.items.find(item => item.id === parseInt(productId));
          
          if (item && discount) {
            try {
              const itemTotal = item.price * item.quantity;
              const urunIndirimMiktari = calculateDiscount(itemTotal, discount);
              
              if (urunIndirimMiktari > 0) {
                try {
                  supabase.rpc('indirim_kullan', {
                    p_indirim_id: discount.indirim_id,
                    p_kullanici_id: userId,
                    p_siparis_id: orderData.id,
                    p_kullanilan_tutar: itemTotal,
                    p_indirim_miktari: urunIndirimMiktari,
                  });
                } catch (rpcError) {
                  try {
                    supabase
                      .from('kullanici_indirim_kullanimlari')
                      .insert({
                        indirim_id: discount.indirim_id,
                        kullanici_id: userId,
                        siparis_id: orderData.id,
                        kullanilan_tutar: itemTotal,
                        indirim_miktari: urunIndirimMiktari,
                        kullanma_tarihi: new Date().toISOString(),
                      });
                  } catch (insertError) {
                  }
                }
              }
            } catch (error) {
            }
          }
        });
      }

      // Sepeti temizle
      clearCart();
      clearSelectedDiscount(); // Her ikisini de temizler

      return {
        ...orderData,
        siparis_detaylari: orderDetails
      };

    } catch (error) {
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
    getDiscountedPrice,
    getDiscountAmount,
    loadAvailableDiscounts,
    getDiscountByCode,
    setSelectedDiscount, // Geriye dönük uyumluluk
    setSelectedGeneralDiscount,
    setSelectedProductDiscount,
    clearSelectedDiscount, // Geriye dönük uyumluluk
    clearSelectedProductDiscount,
    selectedGeneralDiscount: state.selectedGeneralDiscount,
    selectedProductDiscounts: state.selectedProductDiscounts,
    userManuallyRemovedGeneralDiscount: state.userManuallyRemovedGeneralDiscount, // Flag'i export et
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
