-- ============================================================================
-- ROLLER FOREIGN KEY HATASI DÜZELTME
-- Bu script mevcut veritabanında roller tablosuna default veriler ekler
-- ============================================================================

-- 1. Default roller ekle (eğer yoksa)
INSERT INTO public.roller (id, ad) VALUES
  (1, 'admin'),
  (2, 'kasiyer'),
  (3, 'garson'),
  (4, 'mutfak'),
  (5, 'musteri')
ON CONFLICT (id) DO UPDATE SET ad = EXCLUDED.ad;

-- 2. Roller sequence'ini güncelle
SELECT setval('roller_id_seq', (SELECT MAX(id) FROM public.roller), true);

-- 3. Kullanıcı profilleri tablosundaki rol_id foreign key constraint'ini güncelle
-- (ON DELETE SET NULL eklemek için constraint'i yeniden oluştur)
ALTER TABLE public.kullanici_profilleri 
  DROP CONSTRAINT IF EXISTS kullanici_profilleri_rol_id_fkey;

ALTER TABLE public.kullanici_profilleri 
  ADD CONSTRAINT kullanici_profilleri_rol_id_fkey 
  FOREIGN KEY (rol_id) 
  REFERENCES public.roller(id) 
  ON DELETE SET NULL;

-- 4. Mevcut kullanıcı profillerinde NULL rol_id'leri varsa default olarak 'musteri' (5) yap
UPDATE public.kullanici_profilleri 
SET rol_id = 5 
WHERE rol_id IS NULL;

-- Tamamlandı
SELECT 'Roller foreign key hatası düzeltildi! Default roller eklendi.' as status;

