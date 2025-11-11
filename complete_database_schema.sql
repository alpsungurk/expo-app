-- ============================================================================
-- COMPLETE DATABASE SCHEMA WITH RLS POLICIES
-- Bu dosya tüm veritabanı şemasını, RLS politikalarını ve gerekli yapılandırmaları içerir
-- ============================================================================

-- ============================================================================
-- 1. TABLOLAR (Tablolar bağımlılık sırasına göre oluşturulmuştur)
-- ============================================================================

-- 1.1. Temel Tablolar (Foreign key bağımlılığı olmayan)
-- ======================================================

-- Roller tablosu
CREATE TABLE IF NOT EXISTS public.roller (
  id SERIAL PRIMARY KEY,
  ad VARCHAR NOT NULL UNIQUE
);

-- Kategoriler tablosu
CREATE TABLE IF NOT EXISTS public.kategoriler (
  id SERIAL PRIMARY KEY,
  ad VARCHAR NOT NULL,
  icon VARCHAR,
  aktif BOOLEAN DEFAULT true,
  sira_no INTEGER DEFAULT 0
);

-- Kampanya türleri tablosu
CREATE TABLE IF NOT EXISTS public.kampanya_turleri (
  id SERIAL PRIMARY KEY,
  ad VARCHAR NOT NULL,
  aciklama TEXT,
  aktif BOOLEAN DEFAULT true
);

-- Masalar tablosu
CREATE TABLE IF NOT EXISTS public.masalar (
  id SERIAL PRIMARY KEY,
  masa_no VARCHAR NOT NULL UNIQUE,
  qr_token VARCHAR NOT NULL UNIQUE,
  aktif BOOLEAN DEFAULT true,
  resim_path VARCHAR
);

-- Sistem ayarları tablosu
CREATE TABLE IF NOT EXISTS public.sistem_ayarlari (
  id SERIAL PRIMARY KEY,
  anahtar VARCHAR NOT NULL UNIQUE,
  deger TEXT
);

-- 1.2. Kullanıcı Profilleri (auth.users'a bağımlı)
-- ================================================

-- Kullanıcı profilleri tablosu
CREATE TABLE IF NOT EXISTS public.kullanici_profilleri (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ad VARCHAR NOT NULL,
  soyad VARCHAR NOT NULL,
  rol_id INTEGER REFERENCES public.roller(id) ON DELETE SET NULL,
  aktif BOOLEAN DEFAULT true,
  telefon VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.3. Ürünler ve İlgili Tablolar
-- ================================

-- Ürünler tablosu
CREATE TABLE IF NOT EXISTS public.urunler (
  id SERIAL PRIMARY KEY,
  kategori_id INTEGER REFERENCES public.kategoriler(id),
  ad VARCHAR NOT NULL,
  aciklama TEXT,
  fiyat NUMERIC NOT NULL,
  aktif BOOLEAN DEFAULT true,
  populer BOOLEAN DEFAULT false,
  yeni_urun BOOLEAN DEFAULT false,
  hazirlanma_suresi INTEGER DEFAULT 5,
  sira_no INTEGER DEFAULT 0,
  resim_path VARCHAR
);

-- Ürün özelleştirme tablosu
CREATE TABLE IF NOT EXISTS public.urun_ozellestirme (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER REFERENCES public.urunler(id) ON DELETE CASCADE,
  secenek_adi VARCHAR NOT NULL,
  secenek_tipi VARCHAR NOT NULL,
  zorunlu BOOLEAN DEFAULT false,
  sira_no INTEGER DEFAULT 0
);

-- Özelleştirme değerleri tablosu
CREATE TABLE IF NOT EXISTS public.ozellestirme_degerleri (
  id SERIAL PRIMARY KEY,
  ozellestirme_id INTEGER REFERENCES public.urun_ozellestirme(id) ON DELETE CASCADE,
  deger_adi VARCHAR NOT NULL,
  ek_fiyat NUMERIC DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  sira_no INTEGER DEFAULT 0
);

-- Ürün malzemeleri tablosu
CREATE TABLE IF NOT EXISTS public.urun_malzemeleri (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER REFERENCES public.urunler(id) ON DELETE CASCADE,
  malzeme_adi VARCHAR NOT NULL,
  sira_no INTEGER DEFAULT 0
);

-- Ürün alerjenleri tablosu
CREATE TABLE IF NOT EXISTS public.urun_alerjenleri (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER REFERENCES public.urunler(id) ON DELETE CASCADE,
  alerjen_adi VARCHAR NOT NULL,
  sira_no INTEGER DEFAULT 0
);

-- 1.4. Kampanyalar ve İndirimler
-- ===============================

-- Kampanyalar tablosu
CREATE TABLE IF NOT EXISTS public.kampanyalar (
  id SERIAL PRIMARY KEY,
  ad VARCHAR NOT NULL,
  aciklama TEXT,
  baslangic_tarihi TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  bitis_tarihi TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  aktif BOOLEAN DEFAULT true,
  resim_path VARCHAR,
  kampanya_turu_id INTEGER REFERENCES public.kampanya_turleri(id),
  kampanya_aciklama TEXT
);

-- İndirimler tablosu
CREATE TABLE IF NOT EXISTS public.indirimler (
  id SERIAL PRIMARY KEY,
  kampanya_id INTEGER NOT NULL REFERENCES public.kampanyalar(id) ON DELETE CASCADE,
  indirim_tipi VARCHAR NOT NULL CHECK (indirim_tipi IN ('yuzde', 'miktar')),
  indirim_degeri NUMERIC NOT NULL,
  minimum_tutar NUMERIC,
  maksimum_indirim NUMERIC,
  aktif BOOLEAN DEFAULT true
);

-- Kampanya ürünleri tablosu
CREATE TABLE IF NOT EXISTS public.kampanya_urunleri (
  id SERIAL PRIMARY KEY,
  kampanya_id INTEGER REFERENCES public.kampanyalar(id) ON DELETE CASCADE,
  urun_id INTEGER REFERENCES public.urunler(id) ON DELETE CASCADE,
  kategori_id INTEGER REFERENCES public.kategoriler(id) ON DELETE CASCADE
);

-- 1.5. Duyurular ve Bildirimler
-- ==============================

-- Duyurular tablosu
CREATE TABLE IF NOT EXISTS public.duyurular (
  id SERIAL PRIMARY KEY,
  baslik VARCHAR NOT NULL,
  icerik TEXT NOT NULL,
  resim_path VARCHAR,
  baslangic_tarihi TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  bitis_tarihi TIMESTAMP WITHOUT TIME ZONE,
  aktif BOOLEAN DEFAULT true,
  oncelik INTEGER DEFAULT 0,
  duyuru_aciklama TEXT
);

-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS public.bildirimler (
  id SERIAL PRIMARY KEY,
  baslik VARCHAR NOT NULL,
  icerik TEXT NOT NULL,
  tip VARCHAR DEFAULT 'genel',
  aktif BOOLEAN DEFAULT true,
  olusturma_tarihi TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  hedef VARCHAR DEFAULT 'tum',
  hedef_id INTEGER
);

-- 1.6. Yeni Öneriler
-- ===================

-- Yeni öneriler tablosu
CREATE TABLE IF NOT EXISTS public.yeni_oneriler (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  baslik VARCHAR NOT NULL,
  aciklama TEXT,
  resim_path VARCHAR,
  baslangic_tarihi TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  bitis_tarihi TIMESTAMP WITHOUT TIME ZONE,
  aktif BOOLEAN DEFAULT true
);

-- 1.7. Push Tokens
-- =================

-- Push tokens tablosu
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.8. Siparişler
-- ================

-- Siparişler tablosu
CREATE TABLE IF NOT EXISTS public.siparisler (
  id SERIAL PRIMARY KEY,
  masa_id INTEGER NOT NULL REFERENCES public.masalar(id),
  siparis_no VARCHAR NOT NULL UNIQUE,
  toplam_tutar NUMERIC NOT NULL,
  durum VARCHAR DEFAULT 'hazirlaniyor' CHECK (durum IN ('beklemede', 'hazirlaniyor', 'hazir', 'teslim_edildi', 'iptal')),
  aciklama TEXT,
  olusturma_tarihi TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  telefon_token VARCHAR,
  push_token_id UUID REFERENCES public.push_tokens(id)
);

-- Sipariş detayları tablosu
CREATE TABLE IF NOT EXISTS public.siparis_detaylari (
  id SERIAL PRIMARY KEY,
  siparis_id INTEGER REFERENCES public.siparisler(id) ON DELETE CASCADE,
  urun_id INTEGER REFERENCES public.urunler(id),
  adet INTEGER NOT NULL DEFAULT 1,
  birim_fiyat NUMERIC NOT NULL,
  toplam_fiyat NUMERIC NOT NULL,
  ozellestirmeler JSONB,
  notlar TEXT
);

-- 1.9. Performans İstatistikleri
-- ==============================

-- Performans istatistikleri tablosu
CREATE TABLE IF NOT EXISTS public.performans_istatistikleri (
  id SERIAL PRIMARY KEY,
  tarih DATE NOT NULL,
  toplam_siparis INTEGER DEFAULT 0,
  toplam_tutar NUMERIC DEFAULT 0,
  ortalama_hazirlanma_suresi INTEGER DEFAULT 0,
  en_populer_urun_id INTEGER REFERENCES public.urunler(id),
  en_cok_kullanilan_masa_id INTEGER REFERENCES public.masalar(id),
  aktif_masa_sayisi INTEGER DEFAULT 0,
  olusturma_tarihi TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. INDEX'LER (Performans için)
-- ============================================================================

-- Bildirimler index'leri
CREATE INDEX IF NOT EXISTS idx_bildirimler_tip ON public.bildirimler (tip);

-- Duyurular index'leri
CREATE INDEX IF NOT EXISTS idx_duyurular_oncelik ON public.duyurular (oncelik DESC);
CREATE INDEX IF NOT EXISTS idx_duyurular_tarih ON public.duyurular (baslangic_tarihi, bitis_tarihi);

-- Kampanyalar index'leri
CREATE INDEX IF NOT EXISTS idx_kampanyalar_tarih ON public.kampanyalar (baslangic_tarihi, bitis_tarihi);

-- Kategoriler index'leri
CREATE INDEX IF NOT EXISTS idx_kategoriler_aktif ON public.kategoriler (aktif);

-- Masalar index'leri
CREATE INDEX IF NOT EXISTS idx_masalar_aktif ON public.masalar (aktif);

-- Performans istatistikleri index'leri
CREATE INDEX IF NOT EXISTS idx_performans_istatistikleri_tarih ON public.performans_istatistikleri (tarih);

-- Sipariş detayları index'leri
CREATE INDEX IF NOT EXISTS idx_siparis_detaylari_urun_id ON public.siparis_detaylari (urun_id);

-- Siparişler index'leri
CREATE INDEX IF NOT EXISTS idx_siparisler_olusturma_tarihi ON public.siparisler (olusturma_tarihi);

-- Ürünler index'leri
CREATE INDEX IF NOT EXISTS idx_urunler_populer ON public.urunler (populer);
CREATE INDEX IF NOT EXISTS idx_urunler_yeni_urun ON public.urunler (yeni_urun);

-- Yeni öneriler index'leri
CREATE INDEX IF NOT EXISTS idx_yeni_oneriler_aktif ON public.yeni_oneriler (aktif);
CREATE INDEX IF NOT EXISTS idx_yeni_oneriler_tarih ON public.yeni_oneriler (baslangic_tarihi, bitis_tarihi);

-- ============================================================================
-- 3. FONKSİYONLAR
-- ============================================================================

-- Sipariş toplamını hesaplayan fonksiyon
CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(toplam_fiyat), 0) INTO total
    FROM public.siparis_detaylari
    WHERE siparis_id = order_id;
    
    RETURN total;
END;
$$;

-- Sipariş toplamını güncelleyen trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.siparisler
    SET toplam_tutar = calculate_order_total(COALESCE(NEW.siparis_id, OLD.siparis_id))
    WHERE id = COALESCE(NEW.siparis_id, OLD.siparis_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Updated_at kolonunu otomatik güncelleyen fonksiyon
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Sipariş numarasını otomatik oluşturan fonksiyon
CREATE OR REPLACE FUNCTION public.generate_siparis_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.siparis_no IS NULL OR NEW.siparis_no = '' THEN
        NEW.siparis_no := 'SP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('siparisler_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. TRIGGER'LAR
-- ============================================================================

-- Sipariş detayı toplam fiyatını hesaplayan trigger
DROP TRIGGER IF EXISTS trigger_calculate_siparis_detay_total ON public.siparis_detaylari;
CREATE TRIGGER trigger_calculate_siparis_detay_total
    BEFORE INSERT OR UPDATE ON public.siparis_detaylari
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_total();

-- Sipariş toplamını güncelleyen trigger
DROP TRIGGER IF EXISTS trigger_update_siparis_total ON public.siparis_detaylari;
CREATE TRIGGER trigger_update_siparis_total
    AFTER INSERT OR UPDATE OR DELETE ON public.siparis_detaylari
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_total();

-- Sipariş numarasını otomatik oluşturan trigger
DROP TRIGGER IF EXISTS trigger_set_siparis_no ON public.siparisler;
CREATE TRIGGER trigger_set_siparis_no
    BEFORE INSERT ON public.siparisler
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_siparis_no();

-- Updated_at kolonunu otomatik güncelleyen trigger
DROP TRIGGER IF EXISTS trigger_update_kullanici_profilleri_updated_at ON public.kullanici_profilleri;
CREATE TRIGGER trigger_update_kullanici_profilleri_updated_at
    BEFORE UPDATE ON public.kullanici_profilleri
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER trigger_update_push_tokens_updated_at
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) ENABLE
-- ============================================================================

ALTER TABLE public.roller ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategoriler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kampanya_turleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistem_ayarlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kullanici_profilleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urunler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urun_ozellestirme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ozellestirme_degerleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urun_malzemeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urun_alerjenleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kampanyalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indirimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kampanya_urunleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siparisler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siparis_detaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bildirimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duyurular ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yeni_oneriler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performans_istatistikleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLİTİKALARI
-- ============================================================================

-- 6.1. SELECT (Okuma) Politikaları
-- =================================

-- Roller - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.roller;
CREATE POLICY "Herkes okuyabilir" ON public.roller
    FOR SELECT
    TO public
    USING (true);

-- Kategoriler - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kategoriler;
CREATE POLICY "Herkes okuyabilir" ON public.kategoriler
    FOR SELECT
    TO public
    USING (aktif = true);

-- Kampanya türleri - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kampanya_turleri;
CREATE POLICY "Herkes okuyabilir" ON public.kampanya_turleri
    FOR SELECT
    TO public
    USING (aktif = true);

-- Masalar - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.masalar;
CREATE POLICY "Herkes okuyabilir" ON public.masalar
    FOR SELECT
    TO public
    USING (aktif = true);

-- Sistem ayarları - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.sistem_ayarlari;
CREATE POLICY "Herkes okuyabilir" ON public.sistem_ayarlari
    FOR SELECT
    TO public
    USING (true);

-- Kullanıcı profilleri - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kullanici_profilleri;
CREATE POLICY "Herkes okuyabilir" ON public.kullanici_profilleri
    FOR SELECT
    TO public
    USING (true);

-- Ürünler - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.urunler;
CREATE POLICY "Herkes okuyabilir" ON public.urunler
    FOR SELECT
    TO public
    USING (aktif = true);

-- Ürün özelleştirme - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.urun_ozellestirme;
CREATE POLICY "Herkes okuyabilir" ON public.urun_ozellestirme
    FOR SELECT
    TO public
    USING (true);

-- Özelleştirme değerleri - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.ozellestirme_degerleri;
CREATE POLICY "Herkes okuyabilir" ON public.ozellestirme_degerleri
    FOR SELECT
    TO public
    USING (aktif = true);

-- Ürün malzemeleri - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.urun_malzemeleri;
CREATE POLICY "Herkes okuyabilir" ON public.urun_malzemeleri
    FOR SELECT
    TO public
    USING (true);

-- Ürün alerjenleri - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.urun_alerjenleri;
CREATE POLICY "Herkes okuyabilir" ON public.urun_alerjenleri
    FOR SELECT
    TO public
    USING (true);

-- Kampanyalar - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kampanyalar;
CREATE POLICY "Herkes okuyabilir" ON public.kampanyalar
    FOR SELECT
    TO public
    USING (aktif = true);

-- İndirimler - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.indirimler;
CREATE POLICY "Herkes okuyabilir" ON public.indirimler
    FOR SELECT
    TO public
    USING (aktif = true);

-- Kampanya ürünleri - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kampanya_urunleri;
CREATE POLICY "Herkes okuyabilir" ON public.kampanya_urunleri
    FOR SELECT
    TO public
    USING (true);

-- Siparişler - Herkes okuyabilir
DROP POLICY IF EXISTS "Siparişleri okuyabilir" ON public.siparisler;
CREATE POLICY "Siparişleri okuyabilir" ON public.siparisler
    FOR SELECT
    TO public
    USING (true);

-- Sipariş detayları - Herkes okuyabilir
DROP POLICY IF EXISTS "Sipariş detaylarını okuyabilir" ON public.siparis_detaylari;
CREATE POLICY "Sipariş detaylarını okuyabilir" ON public.siparis_detaylari
    FOR SELECT
    TO public
    USING (true);

-- Bildirimler - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.bildirimler;
CREATE POLICY "Herkes okuyabilir" ON public.bildirimler
    FOR SELECT
    TO public
    USING (aktif = true);

-- Duyurular - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.duyurular;
CREATE POLICY "Herkes okuyabilir" ON public.duyurular
    FOR SELECT
    TO public
    USING (aktif = true);

-- Yeni öneriler - Sadece aktif olanları herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.yeni_oneriler;
CREATE POLICY "Herkes okuyabilir" ON public.yeni_oneriler
    FOR SELECT
    TO public
    USING (aktif = true);

-- Performans istatistikleri - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.performans_istatistikleri;
CREATE POLICY "Herkes okuyabilir" ON public.performans_istatistikleri
    FOR SELECT
    TO public
    USING (true);

-- Push tokens - Herkes okuyabilir
DROP POLICY IF EXISTS "Herkes push token okuyabilir" ON public.push_tokens;
CREATE POLICY "Herkes push token okuyabilir" ON public.push_tokens
    FOR SELECT
    TO public
    USING (true);

-- 6.2. INSERT (Ekleme) Politikaları
-- ===================================

-- Kullanıcı profilleri - Herkes profil oluşturabilir
DROP POLICY IF EXISTS "Herkes profil oluşturabilir" ON public.kullanici_profilleri;
CREATE POLICY "Herkes profil oluşturabilir" ON public.kullanici_profilleri
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Siparişler - Herkes sipariş oluşturabilir
DROP POLICY IF EXISTS "Sipariş oluşturabilir" ON public.siparisler;
CREATE POLICY "Sipariş oluşturabilir" ON public.siparisler
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Sipariş detayları - Herkes sipariş detayı oluşturabilir
DROP POLICY IF EXISTS "Sipariş detayı oluşturabilir" ON public.siparis_detaylari;
CREATE POLICY "Sipariş detayı oluşturabilir" ON public.siparis_detaylari
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Sistem ayarları - Herkes sistem ayarı oluşturabilir
DROP POLICY IF EXISTS "Herkes sistem ayarı oluşturabilir" ON public.sistem_ayarlari;
CREATE POLICY "Herkes sistem ayarı oluşturabilir" ON public.sistem_ayarlari
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Bildirimler - Herkes bildirim oluşturabilir
DROP POLICY IF EXISTS "Herkes bildirim oluşturabilir" ON public.bildirimler;
CREATE POLICY "Herkes bildirim oluşturabilir" ON public.bildirimler
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Performans istatistikleri - Herkes performans istatistiği oluşturabilir
DROP POLICY IF EXISTS "Herkes performans istatistiği oluşturabilir" ON public.performans_istatistikleri;
CREATE POLICY "Herkes performans istatistiği oluşturabilir" ON public.performans_istatistikleri
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Push tokens - Herkes push token ekleyebilir
DROP POLICY IF EXISTS "Herkes push token ekleyebilir" ON public.push_tokens;
CREATE POLICY "Herkes push token ekleyebilir" ON public.push_tokens
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 6.3. UPDATE (Güncelleme) Politikaları
-- =======================================

-- Kullanıcı profilleri - Herkes güncelleyebilir (kendi profilini güncelleyebilir şeklinde de yapılabilir)
-- Şu an herkes güncelleyebilir olarak ayarlanmış
DROP POLICY IF EXISTS "Kendi profilini güncelleyebilir" ON public.kullanici_profilleri;
CREATE POLICY "Kendi profilini güncelleyebilir" ON public.kullanici_profilleri
    FOR UPDATE
    TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Siparişler - Herkes sipariş güncelleyebilir
DROP POLICY IF EXISTS "Sipariş güncelleyebilir" ON public.siparisler;
CREATE POLICY "Sipariş güncelleyebilir" ON public.siparisler
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Sipariş detayları - Herkes sipariş detayı güncelleyebilir
DROP POLICY IF EXISTS "Sipariş detayı güncelleyebilir" ON public.siparis_detaylari;
CREATE POLICY "Sipariş detayı güncelleyebilir" ON public.siparis_detaylari
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Sistem ayarları - Herkes sistem ayarı güncelleyebilir
DROP POLICY IF EXISTS "Herkes sistem ayarı güncelleyebilir" ON public.sistem_ayarlari;
CREATE POLICY "Herkes sistem ayarı güncelleyebilir" ON public.sistem_ayarlari
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Bildirimler - Herkes bildirim güncelleyebilir
DROP POLICY IF EXISTS "Herkes bildirim güncelleyebilir" ON public.bildirimler;
CREATE POLICY "Herkes bildirim güncelleyebilir" ON public.bildirimler
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Performans istatistikleri - Herkes performans istatistiği güncelleyebilir
DROP POLICY IF EXISTS "Herkes performans istatistiği güncelleyebilir" ON public.performans_istatistikleri;
CREATE POLICY "Herkes performans istatistiği güncelleyebilir" ON public.performans_istatistikleri
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Push tokens - Herkes push token güncelleyebilir
DROP POLICY IF EXISTS "Herkes push token güncelleyebilir" ON public.push_tokens;
CREATE POLICY "Herkes push token güncelleyebilir" ON public.push_tokens
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- 6.4. DELETE (Silme) Politikaları
-- ===================================

-- Siparişler - Herkes sipariş silebilir
DROP POLICY IF EXISTS "Sipariş silebilir" ON public.siparisler;
CREATE POLICY "Sipariş silebilir" ON public.siparisler
    FOR DELETE
    TO public
    USING (true);

-- Sipariş detayları - Herkes sipariş detayı silebilir
DROP POLICY IF EXISTS "Sipariş detayı silebilir" ON public.siparis_detaylari;
CREATE POLICY "Sipariş detayı silebilir" ON public.siparis_detaylari
    FOR DELETE
    TO public
    USING (true);

-- Sistem ayarları - Herkes sistem ayarı silebilir
DROP POLICY IF EXISTS "Herkes sistem ayarı silebilir" ON public.sistem_ayarlari;
CREATE POLICY "Herkes sistem ayarı silebilir" ON public.sistem_ayarlari
    FOR DELETE
    TO public
    USING (true);

-- Bildirimler - Herkes bildirim silebilir
DROP POLICY IF EXISTS "Herkes bildirim silebilir" ON public.bildirimler;
CREATE POLICY "Herkes bildirim silebilir" ON public.bildirimler
    FOR DELETE
    TO public
    USING (true);

-- Performans istatistikleri - Herkes performans istatistiği silebilir
DROP POLICY IF EXISTS "Herkes performans istatistiği silebilir" ON public.performans_istatistikleri;
CREATE POLICY "Herkes performans istatistiği silebilir" ON public.performans_istatistikleri
    FOR DELETE
    TO public
    USING (true);

-- ============================================================================
-- 7. STORAGE POLİTİKALARI (Eğer storage bucket'ları kullanılıyorsa)
-- ============================================================================

-- Storage bucket'ı oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resimler', 'resimler', true)
ON CONFLICT (id) DO NOTHING;

-- Storage politikaları
DROP POLICY IF EXISTS "Herkes resimleri okuyabilir" ON storage.objects;
CREATE POLICY "Herkes resimleri okuyabilir" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'resimler');

DROP POLICY IF EXISTS "Herkes resim yükleyebilir" ON storage.objects;
CREATE POLICY "Herkes resim yükleyebilir" ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'resimler');

DROP POLICY IF EXISTS "Herkes resim güncelleyebilir" ON storage.objects;
CREATE POLICY "Herkes resim güncelleyebilir" ON storage.objects
    FOR UPDATE
    TO public
    USING (bucket_id = 'resimler')
    WITH CHECK (bucket_id = 'resimler');

DROP POLICY IF EXISTS "Herkes resim silebilir" ON storage.objects;
CREATE POLICY "Herkes resim silebilir" ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'resimler');

-- ============================================================================
-- 8. DEFAULT VERİLER (Seed Data)
-- ============================================================================

-- Default roller ekle
INSERT INTO public.roller (id, ad) VALUES
  (1, 'admin'),
  (2, 'kasiyer'),
  (3, 'garson'),
  (4, 'mutfak'),
  (5, 'musteri')
ON CONFLICT (id) DO NOTHING;

-- Roller sequence'ini güncelle (eğer manuel ID kullanıyorsak)
SELECT setval('roller_id_seq', (SELECT MAX(id) FROM public.roller), true);

-- ============================================================================
-- 9. TAMAMLANDI
-- ============================================================================

SELECT 'Veritabanı şeması, RLS politikaları ve default veriler başarıyla oluşturuldu!' as status;

