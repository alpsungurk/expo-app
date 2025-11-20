-- ============================================
-- İNDİRİM SİSTEMİ SQL KODLARI - TEMİZ VERSİYON
-- ============================================
-- Bu script, indirim sistemini oluşturur ve yapılandırır
-- Supabase SQL Editor'da çalıştırın
-- 
-- ÖNEMLİ: Bu script'i çalıştırmadan önce mevcut veritabanı yapısının
-- kampanyalar ve indirimler tablolarının mevcut olduğundan emin olun

-- ==================== 1. ESKİ VIEW'LARI VE FONKSİYONLARI TEMİZLE ====================

-- Önce view'ları sil (eski kolonlara bağlı oldukları için)
DROP VIEW IF EXISTS public.indirim_detaylari CASCADE;
DROP VIEW IF EXISTS public.indirim_kullanim_istatistikleri CASCADE;

-- Eski fonksiyonları sil
DROP FUNCTION IF EXISTS public.kullanici_indirimleri_getir(uuid, numeric, integer[], integer[]) CASCADE;
DROP FUNCTION IF EXISTS public.indirim_kullan(integer, uuid, integer, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.indirim_kod_ile_getir(character varying, uuid, numeric, integer[], integer[]) CASCADE;
DROP FUNCTION IF EXISTS public.set_ilk_kayit_tarihi() CASCADE;

-- ==================== 2. ESKİ KOLONLARI TEMİZLE ====================

-- Eğer eski kolonlar varsa kaldır
ALTER TABLE public.indirimler 
DROP COLUMN IF EXISTS once_kullanildi,
DROP COLUMN IF EXISTS kullanim_sayisi_limit;

-- kullanici_profilleri tablosundan eski kolonları kaldır
ALTER TABLE public.kullanici_profilleri
DROP COLUMN IF EXISTS uygulama_indirme_tarihi,
DROP COLUMN IF EXISTS uygulama_indirme_indirimi_kullanildi,
DROP COLUMN IF EXISTS ilk_kayit_tarihi;

-- Eski trigger'ı kaldır
DROP TRIGGER IF EXISTS trigger_set_ilk_kayit_tarihi ON kullanici_profilleri;

-- ==================== 3. İNDİRİMLER TABLOSUNU GENİŞLETME ====================

-- Mevcut indirimler tablosuna yeni alanlar ekle
ALTER TABLE public.indirimler 
ADD COLUMN IF NOT EXISTS hedef_tipi character varying DEFAULT 'genel' CHECK (
  hedef_tipi::text = ANY (
    ARRAY[
      'genel'::character varying,
      'kayit'::character varying,
      'kisi_bazli'::character varying
    ]::text[]
  )
),
ADD COLUMN IF NOT EXISTS kullanici_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS toplam_kullanim_limit integer DEFAULT NULL, -- Tüm sistemde toplam kaç kez kullanılabileceği (null = sınırsız)
ADD COLUMN IF NOT EXISTS kullanim_sayisi integer DEFAULT 0, -- Şu ana kadar kaç kez kullanıldı
ADD COLUMN IF NOT EXISTS kullanici_basina_limit integer DEFAULT NULL, -- Her kullanıcı kaç kez kullanabilir (1 = tek kullanımlık, null = sınırsız)
ADD COLUMN IF NOT EXISTS kod character varying UNIQUE, -- İndirim kodu (opsiyonel)
ADD COLUMN IF NOT EXISTS kisi_filtre_tipi character varying CHECK (
  kisi_filtre_tipi IS NULL OR kisi_filtre_tipi::text = ANY (
    ARRAY[
      'yeni_kayit'::character varying,
      'eski_kullanici'::character varying,
      'toplam_siparis'::character varying,
      'toplam_harcama'::character varying
    ]::text[]
  )
), -- Kişi bazlı indirimler için filtre tipi
ADD COLUMN IF NOT EXISTS kisi_filtre_degeri integer DEFAULT NULL, -- Filtre değeri (gün sayısı, sipariş sayısı, vb.)
ADD COLUMN IF NOT EXISTS kisi_filtre_operator character varying DEFAULT '>=' CHECK (
  kisi_filtre_operator IS NULL OR kisi_filtre_operator::text = ANY (
    ARRAY['>='::character varying, '<='::character varying, '='::character varying]::text[]
  )
), -- Filtre operatörü
ADD COLUMN IF NOT EXISTS urun_filtre_tipi character varying CHECK (
  urun_filtre_tipi IS NULL OR urun_filtre_tipi::text = ANY (
    ARRAY[
      'urun'::character varying,
      'kategori'::character varying,
      'yeni_urun'::character varying,
      'populer_urun'::character varying
    ]::text[]
  )
), -- Ürün bazlı indirimler için filtre tipi
ADD COLUMN IF NOT EXISTS urun_id integer REFERENCES public.urunler(id) ON DELETE CASCADE, -- Belirli ürün için indirim
ADD COLUMN IF NOT EXISTS kategori_id integer REFERENCES public.kategoriler(id) ON DELETE CASCADE; -- Belirli kategori için indirim

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_indirimler_hedef_tipi ON public.indirimler(hedef_tipi);
CREATE INDEX IF NOT EXISTS idx_indirimler_kullanici_id ON public.indirimler(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_indirimler_kod ON public.indirimler(kod) WHERE kod IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_indirimler_urun_id ON public.indirimler(urun_id) WHERE urun_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_indirimler_kategori_id ON public.indirimler(kategori_id) WHERE kategori_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_indirimler_urun_filtre_tipi ON public.indirimler(urun_filtre_tipi) WHERE urun_filtre_tipi IS NOT NULL;

-- ==================== 4. KULLANICI İNDİRİM KULLANIMLARI TABLOSU ====================

CREATE TABLE IF NOT EXISTS public.kullanici_indirim_kullanimlari (
  id serial NOT NULL,
  indirim_id integer NOT NULL,
  kullanici_id uuid NOT NULL,
  siparis_id integer, -- Hangi siparişte kullanıldı
  kullanilan_tutar numeric NOT NULL, -- İndirim uygulanan tutar
  indirim_miktari numeric NOT NULL, -- Uygulanan indirim miktarı
  kullanma_tarihi timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT kullanici_indirim_kullanimlari_pkey PRIMARY KEY (id),
  CONSTRAINT kullanici_indirim_kullanimlari_indirim_id_fkey 
    FOREIGN KEY (indirim_id) REFERENCES public.indirimler(id) ON DELETE CASCADE,
  CONSTRAINT kullanici_indirim_kullanimlari_kullanici_id_fkey 
    FOREIGN KEY (kullanici_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT kullanici_indirim_kullanimlari_siparis_id_fkey 
    FOREIGN KEY (siparis_id) REFERENCES public.siparisler(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_kullanim_indirim_id ON public.kullanici_indirim_kullanimlari(indirim_id);
CREATE INDEX IF NOT EXISTS idx_kullanim_kullanici_id ON public.kullanici_indirim_kullanimlari(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_kullanim_siparis_id ON public.kullanici_indirim_kullanimlari(siparis_id);
CREATE INDEX IF NOT EXISTS idx_kullanim_tarih ON public.kullanici_indirim_kullanimlari(kullanma_tarihi);

-- ==================== 5. KULLANICI PROFİLLERİ TABLOSUNU GENİŞLETME ====================

ALTER TABLE public.kullanici_profilleri
ADD COLUMN IF NOT EXISTS kayit_indirimi_kullanildi boolean DEFAULT false;

-- ==================== 6. RLS POLİTİKALARI ====================

-- İndirimler tablosu için RLS politikaları
ALTER TABLE indirimler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Indirimler herkes okuyabilir" ON indirimler;
CREATE POLICY "Indirimler herkes okuyabilir" 
ON indirimler FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Indirimler admin ekleyebilir" ON indirimler;
CREATE POLICY "Indirimler admin ekleyebilir" 
ON indirimler FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

DROP POLICY IF EXISTS "Indirimler admin güncelleyebilir" ON indirimler;
CREATE POLICY "Indirimler admin güncelleyebilir" 
ON indirimler FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

DROP POLICY IF EXISTS "Indirimler admin silebilir" ON indirimler;
CREATE POLICY "Indirimler admin silebilir" 
ON indirimler FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

-- Kullanıcı indirim kullanımları için RLS politikaları
ALTER TABLE kullanici_indirim_kullanimlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanici indirim kullanimlari herkes okuyabilir" ON kullanici_indirim_kullanimlari;
CREATE POLICY "Kullanici indirim kullanimlari herkes okuyabilir" 
ON kullanici_indirim_kullanimlari FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Kullanici indirim kullanimlari admin ekleyebilir" ON kullanici_indirim_kullanimlari;
CREATE POLICY "Kullanici indirim kullanimlari admin ekleyebilir" 
ON kullanici_indirim_kullanimlari FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

DROP POLICY IF EXISTS "Kullanici indirim kullanimlari admin guncelleyebilir" ON kullanici_indirim_kullanimlari;
CREATE POLICY "Kullanici indirim kullanimlari admin guncelleyebilir" 
ON kullanici_indirim_kullanimlari FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

DROP POLICY IF EXISTS "Kullanici indirim kullanimlari admin silebilir" ON kullanici_indirim_kullanimlari;
CREATE POLICY "Kullanici indirim kullanimlari admin silebilir" 
ON kullanici_indirim_kullanimlari FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM kullanici_profilleri
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  )
);

-- ==================== 7. İNDİRİM KONTROL FONKSİYONU ====================

-- Kullanıcının kullanabileceği indirimleri getiren fonksiyon
CREATE OR REPLACE FUNCTION public.kullanici_indirimleri_getir(
  p_kullanici_id uuid,
  p_toplam_tutar numeric,
  p_urun_ids integer[] DEFAULT NULL, -- Sepetteki ürün ID'leri (opsiyonel)
  p_kategori_ids integer[] DEFAULT NULL -- Sepetteki ürünlerin kategori ID'leri (opsiyonel)
)
RETURNS TABLE (
  indirim_id integer,
  kampanya_adi character varying,
  indirim_tipi character varying,
  indirim_degeri numeric,
  uygulanabilir_indirim numeric,
  hedef_tipi character varying,
  kod character varying,
  urun_filtre_tipi character varying,
  urun_id integer,
  kategori_id integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    k.ad as kampanya_adi,
    i.indirim_tipi,
    i.indirim_degeri,
    CASE 
      WHEN i.indirim_tipi = 'yuzde' THEN
        LEAST(
          (p_toplam_tutar * i.indirim_degeri / 100),
          p_toplam_tutar
        )
      ELSE
        LEAST(i.indirim_degeri, p_toplam_tutar)
    END as uygulanabilir_indirim,
    i.hedef_tipi,
    i.kod,
    i.urun_filtre_tipi,
    i.urun_id,
    i.kategori_id
  FROM indirimler i
  INNER JOIN kampanyalar k ON i.kampanya_id = k.id
  WHERE 
    i.aktif = true
    AND k.aktif = true
    AND CURRENT_TIMESTAMP BETWEEN k.baslangic_tarihi AND k.bitis_tarihi
    AND (
      -- Ürün/kategori filtresi kontrolü
      i.urun_filtre_tipi IS NULL -- Filtre yoksa tüm ürünlere uygulanabilir
      OR
      (
        -- Belirli ürün için indirim
        i.urun_filtre_tipi = 'urun'
        AND i.urun_id IS NOT NULL
        AND (p_urun_ids IS NULL OR i.urun_id = ANY(p_urun_ids))
      )
      OR
      (
        -- Belirli kategori için indirim
        i.urun_filtre_tipi = 'kategori'
        AND i.kategori_id IS NOT NULL
        AND (p_kategori_ids IS NULL OR i.kategori_id = ANY(p_kategori_ids))
      )
      OR
      (
        -- Yeni ürünler için indirim (urunler tablosundan kontrol)
        i.urun_filtre_tipi = 'yeni_urun'
        AND (
          p_urun_ids IS NULL
          OR EXISTS (
            SELECT 1 FROM urunler u
            WHERE u.id = ANY(p_urun_ids)
            AND u.yeni_urun = true
            AND u.aktif = true
          )
        )
      )
      OR
      (
        -- Popüler ürünler için indirim (urunler tablosundan kontrol)
        i.urun_filtre_tipi = 'populer_urun'
        AND (
          p_urun_ids IS NULL
          OR EXISTS (
            SELECT 1 FROM urunler u
            WHERE u.id = ANY(p_urun_ids)
            AND u.populer = true
            AND u.aktif = true
          )
        )
      )
    )
    AND (
      -- Genel indirimler
      i.hedef_tipi = 'genel'
      OR
      -- Kayıt indirimi (henüz kullanılmamış)
      (
        i.hedef_tipi = 'kayit'
        AND EXISTS (
          SELECT 1 FROM kullanici_profilleri kp
          WHERE kp.id = p_kullanici_id
          AND kp.created_at IS NOT NULL
          AND kp.kayit_indirimi_kullanildi = false
        )
      )
      -- NOT: Kişi bazlı indirimler şimdilik devre dışı
    )
    AND (
      -- Toplam kullanım limiti kontrolü (genel kontrol)
      i.toplam_kullanim_limit IS NULL 
      OR i.kullanim_sayisi < i.toplam_kullanim_limit
    )
    AND (
      -- Kullanıcı başına limit kontrolü (genel kontrol)
      i.kullanici_basina_limit IS NULL
      OR (
        SELECT COUNT(*) FROM kullanici_indirim_kullanimlari kik
        WHERE kik.indirim_id = i.id
        AND kik.kullanici_id = p_kullanici_id
      ) < i.kullanici_basina_limit
    )
  ORDER BY 
    CASE i.indirim_tipi
      WHEN 'yuzde' THEN (p_toplam_tutar * i.indirim_degeri / 100)
      ELSE i.indirim_degeri
    END DESC;
END;
$$;

COMMENT ON FUNCTION public.kullanici_indirimleri_getir IS 
'Kullanıcının kullanabileceği aktif indirimleri getirir. Parametreler: kullanıcı ID ve toplam tutar.';

-- ==================== 8. İNDİRİM KULLANIMI KAYDETME FONKSİYONU ====================

CREATE OR REPLACE FUNCTION public.indirim_kullan(
  p_indirim_id integer,
  p_kullanici_id uuid,
  p_siparis_id integer,
  p_kullanilan_tutar numeric,
  p_indirim_miktari numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_kullanim_id integer;
  v_hedef_tipi character varying;
BEGIN
  -- İndirim bilgilerini al
  SELECT hedef_tipi INTO v_hedef_tipi
  FROM indirimler
  WHERE id = p_indirim_id;
  
  IF v_hedef_tipi IS NULL THEN
    RAISE EXCEPTION 'İndirim bulunamadı';
  END IF;
  
  -- Kullanım kaydı oluştur
  INSERT INTO kullanici_indirim_kullanimlari (
    indirim_id,
    kullanici_id,
    siparis_id,
    kullanilan_tutar,
    indirim_miktari
  ) VALUES (
    p_indirim_id,
    p_kullanici_id,
    p_siparis_id,
    p_kullanilan_tutar,
    p_indirim_miktari
  )
  RETURNING id INTO v_kullanim_id;
  
  -- İndirim kullanım sayısını artır
  UPDATE indirimler
  SET kullanim_sayisi = kullanim_sayisi + 1
  WHERE id = p_indirim_id;
  
  -- Eğer kayıt indirimi ise, kullanıcı profilini güncelle
  IF v_hedef_tipi = 'kayit' THEN
    UPDATE kullanici_profilleri
    SET kayit_indirimi_kullanildi = true
    WHERE id = p_kullanici_id;
  END IF;
  
  RETURN v_kullanim_id;
END;
$$;

COMMENT ON FUNCTION public.indirim_kullan IS 
'İndirim kullanımını kaydeder ve ilgili tabloları günceller.';

-- ==================== 9. İNDİRİM KODU İLE GETİRME FONKSİYONU ====================

CREATE OR REPLACE FUNCTION public.indirim_kod_ile_getir(
  p_kod character varying,
  p_kullanici_id uuid,
  p_toplam_tutar numeric,
  p_urun_ids integer[] DEFAULT NULL, -- Sepetteki ürün ID'leri (opsiyonel)
  p_kategori_ids integer[] DEFAULT NULL -- Sepetteki ürünlerin kategori ID'leri (opsiyonel)
)
RETURNS TABLE (
  indirim_id integer,
  kampanya_adi character varying,
  indirim_tipi character varying,
  indirim_degeri numeric,
  uygulanabilir_indirim numeric,
  hedef_tipi character varying,
  urun_filtre_tipi character varying,
  urun_id integer,
  kategori_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    k.ad as kampanya_adi,
    i.indirim_tipi,
    i.indirim_degeri,
    CASE 
      WHEN i.indirim_tipi = 'yuzde' THEN
        LEAST(
          (p_toplam_tutar * i.indirim_degeri / 100),
          p_toplam_tutar
        )
      ELSE
        LEAST(i.indirim_degeri, p_toplam_tutar)
    END as uygulanabilir_indirim,
    i.hedef_tipi,
    i.urun_filtre_tipi,
    i.urun_id,
    i.kategori_id
  FROM indirimler i
  INNER JOIN kampanyalar k ON i.kampanya_id = k.id
  WHERE 
    i.kod = p_kod
    AND i.aktif = true
    AND k.aktif = true
    AND CURRENT_TIMESTAMP BETWEEN k.baslangic_tarihi AND k.bitis_tarihi
    AND (
      -- Ürün/kategori filtresi kontrolü
      i.urun_filtre_tipi IS NULL -- Filtre yoksa tüm ürünlere uygulanabilir
      OR
      (
        -- Belirli ürün için indirim
        i.urun_filtre_tipi = 'urun'
        AND i.urun_id IS NOT NULL
        AND (p_urun_ids IS NULL OR i.urun_id = ANY(p_urun_ids))
      )
      OR
      (
        -- Belirli kategori için indirim
        i.urun_filtre_tipi = 'kategori'
        AND i.kategori_id IS NOT NULL
        AND (p_kategori_ids IS NULL OR i.kategori_id = ANY(p_kategori_ids))
      )
      OR
      (
        -- Yeni ürünler için indirim
        i.urun_filtre_tipi = 'yeni_urun'
        AND (
          p_urun_ids IS NULL
          OR EXISTS (
            SELECT 1 FROM urunler u
            WHERE u.id = ANY(p_urun_ids)
            AND u.yeni_urun = true
            AND u.aktif = true
          )
        )
      )
      OR
      (
        -- Popüler ürünler için indirim
        i.urun_filtre_tipi = 'populer_urun'
        AND (
          p_urun_ids IS NULL
          OR EXISTS (
            SELECT 1 FROM urunler u
            WHERE u.id = ANY(p_urun_ids)
            AND u.populer = true
            AND u.aktif = true
          )
        )
      )
    )
    AND (
      -- Genel indirimler
      i.hedef_tipi = 'genel'
      OR
      -- Kayıt indirimi (henüz kullanılmamış)
      (
        i.hedef_tipi = 'kayit'
        AND p_kullanici_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM kullanici_profilleri kp
          WHERE kp.id = p_kullanici_id
          AND kp.created_at IS NOT NULL
          AND kp.kayit_indirimi_kullanildi = false
        )
      )
      -- NOT: Kişi bazlı indirimler şimdilik devre dışı
    )
    AND (
      -- Toplam kullanım limiti kontrolü
      i.toplam_kullanim_limit IS NULL 
      OR i.kullanim_sayisi < i.toplam_kullanim_limit
    )
    AND (
      -- Kullanıcı başına limit kontrolü
      OR i.kullanici_basina_limit IS NULL
      OR (
        SELECT COUNT(*) FROM kullanici_indirim_kullanimlari kik
        WHERE kik.indirim_id = i.id
        AND kik.kullanici_id = p_kullanici_id
      ) < i.kullanici_basina_limit
    )
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.indirim_kod_ile_getir IS 
'İndirim koduna göre geçerli bir indirim getirir.';

-- ==================== 10. YARDIMCI VIEW'LAR ====================

-- İndirim detaylarını gösteren view
CREATE OR REPLACE VIEW public.indirim_detaylari AS
SELECT 
  i.id,
  i.kampanya_id,
  k.ad as kampanya_adi,
  i.indirim_tipi,
  i.indirim_degeri,
  i.aktif,
  i.hedef_tipi,
  i.kullanici_id,
  kp.ad || ' ' || kp.soyad as kullanici_adi,
  i.toplam_kullanim_limit,
  i.kullanim_sayisi,
  i.kullanici_basina_limit,
  i.kod,
  i.kisi_filtre_tipi,
  i.kisi_filtre_degeri,
  i.kisi_filtre_operator,
  i.urun_filtre_tipi,
  i.urun_id,
  u.ad as urun_adi,
  i.kategori_id,
  kat.ad as kategori_adi,
  k.baslangic_tarihi,
  k.bitis_tarihi
FROM indirimler i
LEFT JOIN kampanyalar k ON i.kampanya_id = k.id
LEFT JOIN kullanici_profilleri kp ON i.kullanici_id = kp.id
LEFT JOIN urunler u ON i.urun_id = u.id
LEFT JOIN kategoriler kat ON i.kategori_id = kat.id;

-- Kullanım istatistikleri view'ı
CREATE OR REPLACE VIEW public.indirim_kullanim_istatistikleri AS
SELECT 
  i.id as indirim_id,
  k.ad as kampanya_adi,
  i.hedef_tipi,
  COUNT(kik.id) as toplam_kullanim,
  SUM(kik.indirim_miktari) as toplam_indirim_tutari,
  AVG(kik.indirim_miktari) as ortalama_indirim_tutari,
  MIN(kik.kullanma_tarihi) as ilk_kullanim,
  MAX(kik.kullanma_tarihi) as son_kullanim
FROM indirimler i
LEFT JOIN kampanyalar k ON i.kampanya_id = k.id
LEFT JOIN kullanici_indirim_kullanimlari kik ON i.id = kik.indirim_id
GROUP BY i.id, k.ad, i.hedef_tipi;

-- ==================== 11. TEMİZLEME VE KONTROL ====================

-- Sequence'leri kontrol et ve düzelt
DO $$
DECLARE
  max_id INTEGER;
BEGIN
  -- kullanici_indirim_kullanimlari sequence
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM kullanici_indirim_kullanimlari;
  PERFORM setval('kullanici_indirim_kullanimlari_id_seq', max_id + 1, false);
  
  RAISE NOTICE 'İndirim sistemi başarıyla kuruldu!';
  RAISE NOTICE 'Sequence değerleri güncellendi.';
END $$;

-- ==================== 12. YETKİLER ====================

-- Fonksiyonlar için gerekli yetkiler
GRANT EXECUTE ON FUNCTION public.kullanici_indirimleri_getir TO authenticated;
GRANT EXECUTE ON FUNCTION public.indirim_kullan TO authenticated;
GRANT EXECUTE ON FUNCTION public.indirim_kod_ile_getir TO authenticated;

-- View'lar için yetkiler
GRANT SELECT ON public.indirim_detaylari TO authenticated;
GRANT SELECT ON public.indirim_kullanim_istatistikleri TO authenticated;

-- ============================================
-- KURULUM TAMAMLANDI
-- ============================================
-- Artık indirim sistemini kullanabilirsiniz!
-- 
-- Kullanım örnekleri:
-- 1. Genel indirim: hedef_tipi = 'genel'
-- 2. Kayıt indirimi: hedef_tipi = 'kayit'
-- 3. Kişi bazlı indirim: hedef_tipi = 'kisi_bazli' + filtre kriterleri
-- 4. Ürün bazlı indirim: urun_filtre_tipi = 'urun'/'kategori'/'yeni_urun'/'populer_urun'
--
-- Fonksiyonlar:
-- - kullanici_indirimleri_getir(uuid, numeric, integer[], integer[]) - Kullanıcının indirimlerini getir
--   Parametreler: kullanici_id, toplam_tutar, urun_ids (opsiyonel), kategori_ids (opsiyonel)
-- - indirim_kullan(integer, uuid, integer, numeric, numeric) - İndirim kullan
-- - indirim_kod_ile_getir(varchar, uuid, numeric, integer[], integer[]) - Kod ile indirim getir
--   Parametreler: kod, kullanici_id, toplam_tutar, urun_ids (opsiyonel), kategori_ids (opsiyonel)
--
-- Limitler:
-- - toplam_kullanim_limit: Tüm sistemde toplam kaç kez kullanılabileceği
-- - kullanici_basina_limit: Her kullanıcı kaç kez kullanabilir (1 = tek kullanımlık)
--
-- Ürün/Kategori Filtreleri:
-- - urun_filtre_tipi: 'urun' (belirli ürün), 'kategori' (belirli kategori), 
--   'yeni_urun' (yeni ürünler), 'populer_urun' (popüler ürünler)
-- - urun_id: urun_filtre_tipi = 'urun' ise belirli ürün ID'si
-- - kategori_id: urun_filtre_tipi = 'kategori' ise belirli kategori ID'si

