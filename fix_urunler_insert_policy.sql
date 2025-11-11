-- ============================================================================
-- ÜRÜNLER TABLOSU İÇİN INSERT POLICY DÜZELTMESİ
-- "new row violates row-level security policy" hatasını çözmek için
-- ============================================================================

-- Admin kontrolü için helper fonksiyon (güncellenmiş versiyon)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Eğer kullanıcı giriş yapmamışsa false döndür
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Kullanıcı profilinde admin rolü kontrolü
  RETURN EXISTS (
    SELECT 1 
    FROM public.kullanici_profilleri 
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  );
END;
$$;

-- Ürünler tablosu için INSERT policy - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin ürünler ekleyebilir" ON public.urunler;
CREATE POLICY "Admin ürünler ekleyebilir" ON public.urunler
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Diğer tablolar için de INSERT policy'leri ekle (eğer yoksa)

-- Kategoriler - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin kategoriler ekleyebilir" ON public.kategoriler;
CREATE POLICY "Admin kategoriler ekleyebilir" ON public.kategoriler
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Kampanya türleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin kampanya türleri ekleyebilir" ON public.kampanya_turleri;
CREATE POLICY "Admin kampanya türleri ekleyebilir" ON public.kampanya_turleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Masalar - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin masalar ekleyebilir" ON public.masalar;
CREATE POLICY "Admin masalar ekleyebilir" ON public.masalar
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Ürün özelleştirme - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin ürün özelleştirme ekleyebilir" ON public.urun_ozellestirme;
CREATE POLICY "Admin ürün özelleştirme ekleyebilir" ON public.urun_ozellestirme
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Özelleştirme değerleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin özelleştirme değerleri ekleyebilir" ON public.ozellestirme_degerleri;
CREATE POLICY "Admin özelleştirme değerleri ekleyebilir" ON public.ozellestirme_degerleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Ürün malzemeleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin ürün malzemeleri ekleyebilir" ON public.urun_malzemeleri;
CREATE POLICY "Admin ürün malzemeleri ekleyebilir" ON public.urun_malzemeleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Ürün alerjenleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin ürün alerjenleri ekleyebilir" ON public.urun_alerjenleri;
CREATE POLICY "Admin ürün alerjenleri ekleyebilir" ON public.urun_alerjenleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Kampanyalar - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin kampanyalar ekleyebilir" ON public.kampanyalar;
CREATE POLICY "Admin kampanyalar ekleyebilir" ON public.kampanyalar
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- İndirimler - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin indirimler ekleyebilir" ON public.indirimler;
CREATE POLICY "Admin indirimler ekleyebilir" ON public.indirimler
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Kampanya ürünleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin kampanya ürünleri ekleyebilir" ON public.kampanya_urunleri;
CREATE POLICY "Admin kampanya ürünleri ekleyebilir" ON public.kampanya_urunleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Duyurular - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin duyurular ekleyebilir" ON public.duyurular;
CREATE POLICY "Admin duyurular ekleyebilir" ON public.duyurular
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Yeni öneriler - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin yeni öneriler ekleyebilir" ON public.yeni_oneriler;
CREATE POLICY "Admin yeni öneriler ekleyebilir" ON public.yeni_oneriler
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- ============================================================================
-- DEBUG: Admin kontrolü test fonksiyonu
-- ============================================================================

-- Test için: SELECT public.is_admin();
-- Eğer false dönerse, kullanıcı profilinizde rol_id = 1 olduğundan emin olun

-- ============================================================================
-- TAMAMLANDI
-- ============================================================================

SELECT 'Ürünler INSERT policy düzeltmesi tamamlandı!' as status;





