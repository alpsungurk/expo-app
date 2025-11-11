-- ============================================================================
-- ADMIN KULLANICI POLİTİKALARI (INSERT ve UPDATE)
-- Admin kullanıcıların (rol_id = 1) tüm tablolarda ekleme ve düzenleme yapabilmesi için
-- ============================================================================

-- Admin kontrolü için helper fonksiyon
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
  -- Eğer kullanıcı profili yoksa da false döndür
  RETURN EXISTS (
    SELECT 1 
    FROM public.kullanici_profilleri 
    WHERE id = auth.uid() AND rol_id = 1 AND aktif = true
  );
END;
$$;

-- ============================================================================
-- INSERT (Ekleme) Politikaları - Admin
-- ============================================================================

-- Roller - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin roller ekleyebilir" ON public.roller;
CREATE POLICY "Admin roller ekleyebilir" ON public.roller
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

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

-- Sistem ayarları - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- Kullanıcı profilleri - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin kullanıcı profilleri ekleyebilir" ON public.kullanici_profilleri;
CREATE POLICY "Admin kullanıcı profilleri ekleyebilir" ON public.kullanici_profilleri
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Ürünler - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin ürünler ekleyebilir" ON public.urunler;
CREATE POLICY "Admin ürünler ekleyebilir" ON public.urunler
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

-- Bildirimler - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- Yeni öneriler - Admin ekleyebilir
DROP POLICY IF EXISTS "Admin yeni öneriler ekleyebilir" ON public.yeni_oneriler;
CREATE POLICY "Admin yeni öneriler ekleyebilir" ON public.yeni_oneriler
    FOR INSERT
    TO public
    WITH CHECK (public.is_admin());

-- Siparişler - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- Sipariş detayları - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- Performans istatistikleri - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- Push tokens - Admin ekleyebilir (zaten herkes ekleyebilir, admin için özel policy ekleniyor)
-- Mevcut policy ile birlikte çalışacak

-- ============================================================================
-- UPDATE (Güncelleme) Politikaları - Admin
-- ============================================================================

-- Roller - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin roller güncelleyebilir" ON public.roller;
CREATE POLICY "Admin roller güncelleyebilir" ON public.roller
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Kategoriler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin kategoriler güncelleyebilir" ON public.kategoriler;
CREATE POLICY "Admin kategoriler güncelleyebilir" ON public.kategoriler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Kampanya türleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin kampanya türleri güncelleyebilir" ON public.kampanya_turleri;
CREATE POLICY "Admin kampanya türleri güncelleyebilir" ON public.kampanya_turleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Masalar - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin masalar güncelleyebilir" ON public.masalar;
CREATE POLICY "Admin masalar güncelleyebilir" ON public.masalar
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Sistem ayarları - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin sistem ayarları güncelleyebilir" ON public.sistem_ayarlari;
CREATE POLICY "Admin sistem ayarları güncelleyebilir" ON public.sistem_ayarlari
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Kullanıcı profilleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin kullanıcı profilleri güncelleyebilir" ON public.kullanici_profilleri;
CREATE POLICY "Admin kullanıcı profilleri güncelleyebilir" ON public.kullanici_profilleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Ürünler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin ürünler güncelleyebilir" ON public.urunler;
CREATE POLICY "Admin ürünler güncelleyebilir" ON public.urunler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Ürün özelleştirme - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin ürün özelleştirme güncelleyebilir" ON public.urun_ozellestirme;
CREATE POLICY "Admin ürün özelleştirme güncelleyebilir" ON public.urun_ozellestirme
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Özelleştirme değerleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin özelleştirme değerleri güncelleyebilir" ON public.ozellestirme_degerleri;
CREATE POLICY "Admin özelleştirme değerleri güncelleyebilir" ON public.ozellestirme_degerleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Ürün malzemeleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin ürün malzemeleri güncelleyebilir" ON public.urun_malzemeleri;
CREATE POLICY "Admin ürün malzemeleri güncelleyebilir" ON public.urun_malzemeleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Ürün alerjenleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin ürün alerjenleri güncelleyebilir" ON public.urun_alerjenleri;
CREATE POLICY "Admin ürün alerjenleri güncelleyebilir" ON public.urun_alerjenleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Kampanyalar - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin kampanyalar güncelleyebilir" ON public.kampanyalar;
CREATE POLICY "Admin kampanyalar güncelleyebilir" ON public.kampanyalar
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- İndirimler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin indirimler güncelleyebilir" ON public.indirimler;
CREATE POLICY "Admin indirimler güncelleyebilir" ON public.indirimler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Kampanya ürünleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin kampanya ürünleri güncelleyebilir" ON public.kampanya_urunleri;
CREATE POLICY "Admin kampanya ürünleri güncelleyebilir" ON public.kampanya_urunleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Duyurular - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin duyurular güncelleyebilir" ON public.duyurular;
CREATE POLICY "Admin duyurular güncelleyebilir" ON public.duyurular
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Bildirimler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin bildirimler güncelleyebilir" ON public.bildirimler;
CREATE POLICY "Admin bildirimler güncelleyebilir" ON public.bildirimler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Yeni öneriler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin yeni öneriler güncelleyebilir" ON public.yeni_oneriler;
CREATE POLICY "Admin yeni öneriler güncelleyebilir" ON public.yeni_oneriler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Siparişler - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin siparişler güncelleyebilir" ON public.siparisler;
CREATE POLICY "Admin siparişler güncelleyebilir" ON public.siparisler
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Sipariş detayları - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin sipariş detayları güncelleyebilir" ON public.siparis_detaylari;
CREATE POLICY "Admin sipariş detayları güncelleyebilir" ON public.siparis_detaylari
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Performans istatistikleri - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin performans istatistikleri güncelleyebilir" ON public.performans_istatistikleri;
CREATE POLICY "Admin performans istatistikleri güncelleyebilir" ON public.performans_istatistikleri
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Push tokens - Admin güncelleyebilir
DROP POLICY IF EXISTS "Admin push tokens güncelleyebilir" ON public.push_tokens;
CREATE POLICY "Admin push tokens güncelleyebilir" ON public.push_tokens
    FOR UPDATE
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- TAMAMLANDI
-- ============================================================================

SELECT 'Admin kullanıcı politikaları başarıyla oluşturuldu!' as status;

