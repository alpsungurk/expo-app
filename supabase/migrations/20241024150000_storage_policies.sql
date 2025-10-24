-- Storage Bucket RLS Politikaları
-- Bu migration resim bucket'ı için gerekli politikaları ekler

-- 1. Storage bucket'ı oluştur (eğer yoksa)
-- ========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Storage objects için RLS politikaları
-- ========================================

-- Herkes resimleri okuyabilir (public bucket)
CREATE POLICY "Herkes resimleri okuyabilir" ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Herkes resim yükleyebilir (geliştirme için)
CREATE POLICY "Herkes resim yükleyebilir" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'images');

-- Herkes resim güncelleyebilir (geliştirme için)
CREATE POLICY "Herkes resim güncelleyebilir" ON storage.objects
FOR UPDATE
USING (bucket_id = 'images');

-- Herkes resim silebilir (geliştirme için)
CREATE POLICY "Herkes resim silebilir" ON storage.objects
FOR DELETE
USING (bucket_id = 'images');

-- Migration tamamlandı
SELECT 'Storage bucket politikaları başarıyla eklendi!' as status;
