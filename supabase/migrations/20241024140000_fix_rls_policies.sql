-- RLS Politikalarını Düzeltme Migration
-- Bu migration sipariş oluşturma ve diğer işlemler için gerekli politikaları ekler

-- 1. Siparişler tablosu için INSERT politikası
-- =============================================
CREATE POLICY "Herkes sipariş oluşturabilir" ON public.siparisler 
FOR INSERT 
WITH CHECK (true);

-- 2. Sipariş detayları tablosu için INSERT politikası
-- ===================================================
CREATE POLICY "Herkes sipariş detayı oluşturabilir" ON public.siparis_detaylari 
FOR INSERT 
WITH CHECK (true);

-- 3. Siparişler tablosu için UPDATE politikası
-- ============================================
CREATE POLICY "Herkes sipariş güncelleyebilir" ON public.siparisler 
FOR UPDATE 
USING (true);

-- 4. Sipariş detayları tablosu için UPDATE politikası
-- ==================================================
CREATE POLICY "Herkes sipariş detayı güncelleyebilir" ON public.siparis_detaylari 
FOR UPDATE 
USING (true);

-- 5. Siparişler tablosu için DELETE politikası
-- ============================================
CREATE POLICY "Herkes sipariş silebilir" ON public.siparisler 
FOR DELETE 
USING (true);

-- 6. Sipariş detayları tablosu için DELETE politikası
-- ==================================================
CREATE POLICY "Herkes sipariş detayı silebilir" ON public.siparis_detaylari 
FOR DELETE 
USING (true);

-- 7. Kullanıcı profilleri için INSERT politikası
-- =============================================
CREATE POLICY "Herkes profil oluşturabilir" ON public.kullanici_profilleri 
FOR INSERT 
WITH CHECK (true);

-- 8. Sistem ayarları için INSERT/UPDATE/DELETE politikaları
-- ========================================================
CREATE POLICY "Herkes sistem ayarı oluşturabilir" ON public.sistem_ayarlari 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Herkes sistem ayarı güncelleyebilir" ON public.sistem_ayarlari 
FOR UPDATE 
USING (true);

CREATE POLICY "Herkes sistem ayarı silebilir" ON public.sistem_ayarlari 
FOR DELETE 
USING (true);

-- 9. Bildirimler için INSERT/UPDATE/DELETE politikaları
-- ====================================================
CREATE POLICY "Herkes bildirim oluşturabilir" ON public.bildirimler 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Herkes bildirim güncelleyebilir" ON public.bildirimler 
FOR UPDATE 
USING (true);

CREATE POLICY "Herkes bildirim silebilir" ON public.bildirimler 
FOR DELETE 
USING (true);

-- 10. Performans istatistikleri için INSERT/UPDATE/DELETE politikaları
-- ===================================================================
CREATE POLICY "Herkes performans istatistiği oluşturabilir" ON public.performans_istatistikleri 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Herkes performans istatistiği güncelleyebilir" ON public.performans_istatistikleri 
FOR UPDATE 
USING (true);

CREATE POLICY "Herkes performans istatistiği silebilir" ON public.performans_istatistikleri 
FOR DELETE 
USING (true);

-- Migration tamamlandı
SELECT 'RLS politikaları başarıyla düzeltildi!' as status;
