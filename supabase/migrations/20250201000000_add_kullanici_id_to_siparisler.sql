-- Migration: siparisler tablosuna kullanici_id ekle
-- Bu migration kişi bazlı indirimler için kullanıcı ID'sini siparişlerle ilişkilendirir

-- 1. kullanici_id kolonunu ekle (nullable, çünkü misafir siparişlerde olmayabilir)
ALTER TABLE public.siparisler 
ADD COLUMN IF NOT EXISTS kullanici_id UUID;

-- 2. Foreign key constraint ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'siparisler_kullanici_id_fkey'
  ) THEN
    ALTER TABLE public.siparisler
    ADD CONSTRAINT siparisler_kullanici_id_fkey 
    FOREIGN KEY (kullanici_id) 
    REFERENCES auth.users(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Index ekle (sorgu performansı için)
CREATE INDEX IF NOT EXISTS idx_siparisler_kullanici_id 
ON public.siparisler(kullanici_id) 
WHERE kullanici_id IS NOT NULL;

-- 4. Index ekle (durum ve kullanici_id birlikte sorgulama için - kişi bazlı indirimler için)
CREATE INDEX IF NOT EXISTS idx_siparisler_kullanici_id_durum 
ON public.siparisler(kullanici_id, durum) 
WHERE kullanici_id IS NOT NULL AND durum = 'teslim_edildi';

-- Yorum ekle
COMMENT ON COLUMN public.siparisler.kullanici_id IS 'Kullanıcı ID - siparişi veren kullanıcının auth.users referansı (sadece giriş yapmış kullanıcılar için)';

