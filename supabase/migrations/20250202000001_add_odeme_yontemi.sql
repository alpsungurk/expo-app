-- Migration: Siparişlere ödeme yöntemi kolonu ekle
-- Ödeme yapıldığında hangi yöntemle ödendiğini kaydetmek için

-- 1. ödeme_yontemi kolonunu ekle (nullable, çünkü eski siparişlerde olmayabilir)
ALTER TABLE public.siparisler 
ADD COLUMN IF NOT EXISTS odeme_yontemi VARCHAR(50);

-- 2. Check constraint ekle - sadece belirli ödeme yöntemlerine izin ver
ALTER TABLE public.siparisler 
DROP CONSTRAINT IF EXISTS siparisler_odeme_yontemi_check;

ALTER TABLE public.siparisler 
ADD CONSTRAINT siparisler_odeme_yontemi_check CHECK (
  odeme_yontemi IS NULL OR odeme_yontemi IN ('kart', 'nakit', 'dijital', 'diger')
);

-- 3. Index ekle (sorgu performansı için)
CREATE INDEX IF NOT EXISTS idx_siparisler_odeme_yontemi 
ON public.siparisler(odeme_yontemi) 
WHERE odeme_yontemi IS NOT NULL;

-- 4. Yorum ekle
COMMENT ON COLUMN public.siparisler.odeme_yontemi IS 'Ödeme yöntemi: kart, nakit, dijital, diger (sadece odeme_yapildi durumunda dolu olur)';

