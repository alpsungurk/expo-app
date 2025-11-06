-- Migration: siparisler tablosuna push_token_id ekle
-- Bu migration siparişler ile push_tokens arasında direkt ilişki kurar

-- 1. push_token_id kolonunu ekle (nullable, çünkü eski siparişlerde olmayabilir)
ALTER TABLE public.siparisler 
ADD COLUMN IF NOT EXISTS push_token_id UUID;

-- 2. Foreign key constraint ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'siparisler_push_token_id_fkey'
  ) THEN
    ALTER TABLE public.siparisler
    ADD CONSTRAINT siparisler_push_token_id_fkey 
    FOREIGN KEY (push_token_id) 
    REFERENCES public.push_tokens(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Index ekle (sorgu performansı için)
CREATE INDEX IF NOT EXISTS idx_siparisler_push_token_id 
ON public.siparisler(push_token_id) 
WHERE push_token_id IS NOT NULL;

-- 4. Mevcut siparişler için push_token_id'yi doldur (opsiyonel - telefon_token ile eşleştir)
-- Bu sorgu device_info içinde telefon_token arayarak eşleştirme yapar
UPDATE public.siparisler s
SET push_token_id = pt.id
FROM public.push_tokens pt
WHERE s.telefon_token IS NOT NULL
  AND pt.is_active = true
  AND pt.device_info->>'telefon_token' = s.telefon_token
  AND s.push_token_id IS NULL;

-- Yorum ekle
COMMENT ON COLUMN public.siparisler.push_token_id IS 'Push notification token ID - siparişi veren cihazın push token referansı';

