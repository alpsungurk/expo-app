-- Supabase Local Migration Dosyası
-- Bu dosya veritabanı şemasını Supabase local ortamına geçirmek için kullanılır

-- 1. Temel tablolar (foreign key bağımlılığı olmayan)
-- =====================================================

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
  aktif BOOLEAN DEFAULT true
);

-- Sistem ayarları tablosu
CREATE TABLE IF NOT EXISTS public.sistem_ayarlari (
  id SERIAL PRIMARY KEY,
  anahtar VARCHAR NOT NULL UNIQUE,
  deger TEXT
);

-- 2. Kullanıcı profilleri (auth.users'a bağımlı)
-- ===============================================

-- Kullanıcı profilleri tablosu
CREATE TABLE IF NOT EXISTS public.kullanici_profilleri (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  ad VARCHAR NOT NULL,
  soyad VARCHAR NOT NULL,
  rol_id INTEGER REFERENCES public.roller(id),
  aktif BOOLEAN DEFAULT true
);

-- 3. Ürünler ve ilgili tablolar
-- ==============================

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
  urun_id INTEGER REFERENCES public.urunler(id),
  secenek_adi VARCHAR NOT NULL,
  secenek_tipi VARCHAR NOT NULL,
  zorunlu BOOLEAN DEFAULT false,
  sira_no INTEGER DEFAULT 0
);

-- Özelleştirme değerleri tablosu
CREATE TABLE IF NOT EXISTS public.ozellestirme_degerleri (
  id SERIAL PRIMARY KEY,
  ozellestirme_id INTEGER REFERENCES public.urun_ozellestirme(id),
  deger_adi VARCHAR NOT NULL,
  ek_fiyat NUMERIC DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  sira_no INTEGER DEFAULT 0
);

-- Ürün malzemeleri tablosu
CREATE TABLE IF NOT EXISTS public.urun_malzemeleri (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER REFERENCES public.urunler(id),
  malzeme_adi VARCHAR NOT NULL,
  sira_no INTEGER DEFAULT 0
);

-- Ürün alerjenleri tablosu
CREATE TABLE IF NOT EXISTS public.urun_alerjenleri (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER REFERENCES public.urunler(id),
  alerjen_adi VARCHAR NOT NULL,
  sira_no INTEGER DEFAULT 0
);

-- 4. Kampanyalar ve ilgili tablolar
-- ==================================

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
  kampanya_id INTEGER NOT NULL REFERENCES public.kampanyalar(id),
  indirim_tipi VARCHAR NOT NULL CHECK (indirim_tipi IN ('yuzde', 'miktar')),
  indirim_degeri NUMERIC NOT NULL,
  minimum_tutar NUMERIC,
  maksimum_indirim NUMERIC,
  aktif BOOLEAN DEFAULT true
);

-- Kampanya ürünleri tablosu
CREATE TABLE IF NOT EXISTS public.kampanya_urunleri (
  id SERIAL PRIMARY KEY,
  kampanya_id INTEGER REFERENCES public.kampanyalar(id),
  urun_id INTEGER REFERENCES public.urunler(id),
  kategori_id INTEGER REFERENCES public.kategoriler(id)
);

-- 5. Siparişler ve ilgili tablolar
-- =================================

-- Siparişler tablosu
CREATE TABLE IF NOT EXISTS public.siparisler (
  id SERIAL PRIMARY KEY,
  masa_id INTEGER NOT NULL REFERENCES public.masalar(id),
  siparis_no VARCHAR NOT NULL UNIQUE,
  toplam_tutar NUMERIC NOT NULL,
  durum VARCHAR DEFAULT 'hazırlanıyor' CHECK (durum IN ('beklemede', 'hazirlaniyor', 'hazir', 'teslim_edildi', 'iptal')),
  aciklama TEXT,
  olusturma_tarihi TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  telefon_token VARCHAR
);

-- Sipariş detayları tablosu
CREATE TABLE IF NOT EXISTS public.siparis_detaylari (
  id SERIAL PRIMARY KEY,
  siparis_id INTEGER REFERENCES public.siparisler(id),
  urun_id INTEGER REFERENCES public.urunler(id),
  adet INTEGER NOT NULL DEFAULT 1,
  birim_fiyat NUMERIC NOT NULL,
  toplam_fiyat NUMERIC NOT NULL,
  ozellestirmeler JSONB,
  notlar TEXT
);

-- 6. Bildirimler ve duyurular
-- ============================

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

-- 7. Yeni öneriler
-- =================

-- Yeni öneriler tablosu
CREATE TABLE IF NOT EXISTS public.yeni_oneriler (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER NOT NULL REFERENCES public.urunler(id),
  baslik VARCHAR NOT NULL,
  aciklama TEXT,
  resim_path VARCHAR,
  baslangic_tarihi TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  bitis_tarihi TIMESTAMP WITHOUT TIME ZONE,
  aktif BOOLEAN DEFAULT true
);

-- 8. Performans istatistikleri
-- =============================

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

-- 9. İndeksler (performans için)
-- ===============================

-- Sık kullanılan alanlar için indeksler
CREATE INDEX IF NOT EXISTS idx_urunler_kategori_id ON public.urunler(kategori_id);
CREATE INDEX IF NOT EXISTS idx_urunler_aktif ON public.urunler(aktif);
CREATE INDEX IF NOT EXISTS idx_siparisler_masa_id ON public.siparisler(masa_id);
CREATE INDEX IF NOT EXISTS idx_siparisler_durum ON public.siparisler(durum);
CREATE INDEX IF NOT EXISTS idx_siparis_detaylari_siparis_id ON public.siparis_detaylari(siparis_id);
CREATE INDEX IF NOT EXISTS idx_kampanyalar_aktif ON public.kampanyalar(aktif);
CREATE INDEX IF NOT EXISTS idx_duyurular_aktif ON public.duyurular(aktif);
CREATE INDEX IF NOT EXISTS idx_bildirimler_aktif ON public.bildirimler(aktif);

-- 10. RLS (Row Level Security) Politikaları
-- ==========================================

-- Tüm tablolar için RLS'yi etkinleştir
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

-- Genel okuma politikaları (herkes okuyabilir)
CREATE POLICY "Herkes okuyabilir" ON public.roller FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.kategoriler FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.kampanya_turleri FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.masalar FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.sistem_ayarlari FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.urunler FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.urun_ozellestirme FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.ozellestirme_degerleri FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.urun_malzemeleri FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.urun_alerjenleri FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.kampanyalar FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.indirimler FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.kampanya_urunleri FOR SELECT USING (true);
CREATE POLICY "Herkes okuyabilir" ON public.bildirimler FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.duyurular FOR SELECT USING (aktif = true);
CREATE POLICY "Herkes okuyabilir" ON public.yeni_oneriler FOR SELECT USING (aktif = true);

-- Siparişler için özel politikalar
CREATE POLICY "Masa siparişlerini okuyabilir" ON public.siparisler FOR SELECT USING (true);
CREATE POLICY "Sipariş detaylarını okuyabilir" ON public.siparis_detaylari FOR SELECT USING (true);

-- Kullanıcı profilleri için özel politikalar
CREATE POLICY "Kendi profilini okuyabilir" ON public.kullanici_profilleri FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Kendi profilini güncelleyebilir" ON public.kullanici_profilleri FOR UPDATE USING (auth.uid() = id);

-- Performans istatistikleri için admin politikaları
CREATE POLICY "Admin performans istatistiklerini okuyabilir" ON public.performans_istatistikleri FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kullanici_profilleri 
    WHERE id = auth.uid() AND rol_id = 1
  )
);

-- 11. Fonksiyonlar ve Tetikleyiciler
-- ===================================

-- Sipariş numarası otomatik oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_siparis_no()
RETURNS TEXT AS $$
DECLARE
    new_no TEXT;
    counter INTEGER;
BEGIN
    -- Bugünün tarihini al (YYYYMMDD formatında)
    new_no := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Bugünkü sipariş sayısını al
    SELECT COALESCE(MAX(CAST(SUBSTRING(siparis_no FROM 9) AS INTEGER)), 0) + 1
    INTO counter
    FROM public.siparisler
    WHERE siparis_no LIKE new_no || '%';
    
    -- Sipariş numarasını oluştur (YYYYMMDD + 4 haneli sayı)
    new_no := new_no || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_no;
END;
$$ LANGUAGE plpgsql;

-- Sipariş oluşturulduğunda otomatik sipariş numarası atama
CREATE OR REPLACE FUNCTION set_siparis_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.siparis_no IS NULL OR NEW.siparis_no = '' THEN
        NEW.siparis_no := generate_siparis_no();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_siparis_no
    BEFORE INSERT ON public.siparisler
    FOR EACH ROW
    EXECUTE FUNCTION set_siparis_no();

-- Sipariş detayı toplam fiyat hesaplama
CREATE OR REPLACE FUNCTION calculate_siparis_detay_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.toplam_fiyat := NEW.adet * NEW.birim_fiyat;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_siparis_detay_total
    BEFORE INSERT OR UPDATE ON public.siparis_detaylari
    FOR EACH ROW
    EXECUTE FUNCTION calculate_siparis_detay_total();

-- Sipariş toplam tutar güncelleme
CREATE OR REPLACE FUNCTION update_siparis_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.siparisler
    SET toplam_tutar = (
        SELECT COALESCE(SUM(toplam_fiyat), 0)
        FROM public.siparis_detaylari
        WHERE siparis_id = COALESCE(NEW.siparis_id, OLD.siparis_id)
    )
    WHERE id = COALESCE(NEW.siparis_id, OLD.siparis_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_siparis_total
    AFTER INSERT OR UPDATE OR DELETE ON public.siparis_detaylari
    FOR EACH ROW
    EXECUTE FUNCTION update_siparis_total();

-- Migration tamamlandı
SELECT 'Migration başarıyla tamamlandı!' as status;
