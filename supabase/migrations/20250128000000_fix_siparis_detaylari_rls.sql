-- Siparis Detaylari RLS Politikalarını Düzeltme
-- Bu migration siparis_detaylari tablosu için güncelleme ve silme işlemlerini düzeltir

-- Önce mevcut politikaları kaldır
DROP POLICY IF EXISTS "Herkes sipariş detayı güncelleyebilir" ON public.siparis_detaylari;
DROP POLICY IF EXISTS "Herkes sipariş detayı silebilir" ON public.siparis_detaylari;
DROP POLICY IF EXISTS "Sipariş detaylarını okuyabilir" ON public.siparis_detaylari;

-- Yeni politikaları oluştur
-- SELECT politikası
CREATE POLICY "Sipariş detaylarını okuyabilir" ON public.siparis_detaylari 
FOR SELECT 
USING (true);

-- INSERT politikası
CREATE POLICY "Sipariş detayı oluşturabilir" ON public.siparis_detaylari 
FOR INSERT 
WITH CHECK (true);

-- UPDATE politikası
CREATE POLICY "Sipariş detayı güncelleyebilir" ON public.siparis_detaylari 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- DELETE politikası
CREATE POLICY "Sipariş detayı silebilir" ON public.siparis_detaylari 
FOR DELETE 
USING (true);

-- Siparisler tablosu için de politikaları kontrol et
DROP POLICY IF EXISTS "Herkes sipariş güncelleyebilir" ON public.siparisler;
DROP POLICY IF EXISTS "Herkes sipariş silebilir" ON public.siparisler;
DROP POLICY IF EXISTS "Masa siparişlerini okuyabilir" ON public.siparisler;

-- Siparisler için yeni politikalar
CREATE POLICY "Siparişleri okuyabilir" ON public.siparisler 
FOR SELECT 
USING (true);

CREATE POLICY "Sipariş oluşturabilir" ON public.siparisler 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sipariş güncelleyebilir" ON public.siparisler 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Sipariş silebilir" ON public.siparisler 
FOR DELETE 
USING (true);

-- RLS'nin aktif olduğundan emin ol
ALTER TABLE public.siparis_detaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siparisler ENABLE ROW LEVEL SECURITY;

-- Migration tamamlandı
SELECT 'Siparis detaylari RLS politikaları başarıyla güncellendi!' as status;
