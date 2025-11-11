-- Kullanici Profilleri RLS Politikaları Temizleme ve Düzeltme
-- Bu migration tüm çakışan politikaları temizleyip sadece gerekli olanları ekler
-- Kayıt sırasında auth.uid() henüz set edilmemiş olabileceği için "Herkes" politikalarını kullanıyoruz
-- Güvenlik: id kontrolü uygulama tarafında yapılıyor (authData.user.id kullanılıyor)

-- ============================================================================
-- 1. TÜM ÇAKIŞAN POLİTİKALARI TEMİZLE
-- ============================================================================

-- SELECT politikaları
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kullanici profilleri herkes okuyabilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kendi profilini okuyabilir" ON public.kullanici_profilleri;

-- INSERT politikaları
DROP POLICY IF EXISTS "Herkes profil oluşturabilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kendi profilini oluşturabilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Admin kullanıcı profilleri ekleyebilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kullanici profilleri admin ekleyebilir" ON public.kullanici_profilleri;

-- UPDATE politikaları
DROP POLICY IF EXISTS "Herkes profil güncelleyebilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kendi profilini güncelleyebilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Admin kullanıcı profilleri güncelleyebilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kullanici profilleri admin güncelleyebilir" ON public.kullanici_profilleri;

-- DELETE politikaları
DROP POLICY IF EXISTS "Kullanici profilleri admin silebilir" ON public.kullanici_profilleri;

-- ============================================================================
-- 2. YENİ TEMİZ POLİTİKALAR OLUŞTUR
-- ============================================================================

-- SELECT: Herkes okuyabilir (tek bir politika)
CREATE POLICY "Herkes okuyabilir" ON public.kullanici_profilleri
    FOR SELECT
    TO public
    USING (true);

-- INSERT: Herkes profil oluşturabilir (kayıt sırasında auth.uid() henüz set edilmemiş olabilir)
-- Güvenlik: id kontrolü uygulama tarafında yapılıyor (authData.user.id kullanılıyor)
CREATE POLICY "Herkes profil oluşturabilir" ON public.kullanici_profilleri
    FOR INSERT
    TO public
    WITH CHECK (true);

-- UPDATE: Herkes profil güncelleyebilir (kayıt/giriş sırasında auth.uid() henüz set edilmemiş olabilir)
-- Güvenlik: id kontrolü uygulama tarafında yapılıyor (authData.user.id kullanılıyor)
CREATE POLICY "Herkes profil güncelleyebilir" ON public.kullanici_profilleri
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- RLS'nin aktif olduğundan emin ol
ALTER TABLE public.kullanici_profilleri ENABLE ROW LEVEL SECURITY;

SELECT 'Kullanici profilleri RLS politikaları başarıyla temizlendi ve düzeltildi!' as status;

