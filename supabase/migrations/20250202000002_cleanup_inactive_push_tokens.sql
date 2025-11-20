-- Pasif push token'leri temizlemek için cron job
-- 24 saatten eski aktif olmayan veya son aktifliği 24 saatten eski olan token'leri siler

-- 1. pg_cron extension'ını etkinleştir (eğer yoksa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Pasif push token'leri silen fonksiyon
CREATE OR REPLACE FUNCTION cleanup_inactive_push_tokens()
RETURNS TABLE(deleted_count INTEGER, deleted_tokens TEXT[]) AS $$
DECLARE
  deleted_ids UUID[];
  deleted_token_texts TEXT[];
BEGIN
  -- 24 saatten eski pasif token'leri bul ve sil
  -- Koşullar:
  -- 1. is_active = false VEYA
  -- 2. last_active 24 saatten eski (aktif olsa bile kullanılmayan token'ler)
  WITH tokens_to_delete AS (
    SELECT id, push_token
    FROM public.push_tokens
    WHERE (
      is_active = false 
      OR last_active < NOW() - INTERVAL '24 hours'
    )
  )
  SELECT 
    ARRAY_AGG(id),
    ARRAY_AGG(push_token)
  INTO deleted_ids, deleted_token_texts
  FROM tokens_to_delete;

  -- Token'leri sil
  IF deleted_ids IS NOT NULL AND array_length(deleted_ids, 1) > 0 THEN
    DELETE FROM public.push_tokens
    WHERE id = ANY(deleted_ids);
    
    -- Log için (opsiyonel - Supabase'de log tablosu varsa)
    RAISE NOTICE 'Silinen pasif push token sayısı: %', array_length(deleted_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    COALESCE(array_length(deleted_ids, 1), 0)::INTEGER,
    COALESCE(deleted_token_texts, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonksiyon için yorum ekle
COMMENT ON FUNCTION cleanup_inactive_push_tokens() IS 
  'Pasif push token''leri temizler: is_active=false veya last_active 24 saatten eski olan token''leri siler';

-- 4. Cron job oluştur (her gün saat 03:00'de çalışsın)
-- Not: Supabase'de cron job'ları manuel olarak oluşturmanız gerekebilir
-- Aşağıdaki komut Supabase Dashboard'dan veya SQL Editor'den çalıştırılmalı

-- Cron job'ı oluştur (her gün saat 03:00 UTC'de çalışır)
SELECT cron.schedule(
  'cleanup-inactive-push-tokens',           -- Job adı
  '0 3 * * *',                              -- Cron expression: Her gün saat 03:00 UTC
  $$SELECT cleanup_inactive_push_tokens();$$ -- Çalıştırılacak SQL
);

-- Alternatif: Her 24 saatte bir çalıştırmak için (daha esnek)
-- SELECT cron.schedule(
--   'cleanup-inactive-push-tokens-daily',
--   '0 */24 * * *',  -- Her 24 saatte bir
--   $$SELECT cleanup_inactive_push_tokens();$$
-- );

-- Mevcut cron job'ları kontrol etmek için:
-- SELECT * FROM cron.job;

-- Cron job'ı manuel olarak test etmek için:
-- SELECT cleanup_inactive_push_tokens();

-- Cron job'ı silmek için (gerekirse):
-- SELECT cron.unschedule('cleanup-inactive-push-tokens');
