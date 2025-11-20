-- Migration: Sipariş durumlarına ödeme durumlarını ekle
-- teslim_edildi durumundan sonra odeme_yapildi ve odeme_yapilmadi durumları eklenecek

-- 1. Mevcut constraint'i kaldır
ALTER TABLE public.siparisler DROP CONSTRAINT IF EXISTS siparisler_durum_check;

-- 2. Yeni constraint'i ekle (odeme_yapildi ve odeme_yapilmadi ile)
ALTER TABLE public.siparisler 
ADD CONSTRAINT siparisler_durum_check CHECK (
  (durum)::text = ANY (
    ARRAY[
      'beklemede'::character varying,
      'hazirlaniyor'::character varying,
      'hazir'::character varying,
      'teslim_edildi'::character varying,
      'odeme_yapildi'::character varying,
      'odeme_yapilmadi'::character varying,
      'iptal'::character varying
    ]::text[]
  )
);

-- 3. Yorum ekle
COMMENT ON COLUMN public.siparisler.durum IS 'Sipariş durumu: beklemede, hazirlaniyor, hazir, teslim_edildi, odeme_yapildi, odeme_yapilmadi, iptal';

