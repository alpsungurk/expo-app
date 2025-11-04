-- Push notification token'ları için cihaz bazlı tablo
-- Her cihaz için push token'ı saklar ve token değişikliklerini takip eder
-- Kullanıcıya bağlı değil, cihaz bazlı token yönetimi

-- Push token'lar tablosu
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_token TEXT NOT NULL UNIQUE,
  device_info JSONB, -- Cihaz bilgileri: platform, model, osVersion, etc.
  device_id TEXT, -- Benzersiz cihaz ID (platform + model + osVersion kombinasyonu)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_push_tokens_push_token ON public.push_tokens(push_token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON public.push_tokens(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_last_active ON public.push_tokens(last_active);

-- updated_at ve last_active otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- RLS (Row Level Security) Politikaları
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Herkes push token okuyabilir (bildirim göndermek için)
CREATE POLICY "Herkes push token okuyabilir" ON public.push_tokens
  FOR SELECT
  USING (true);

-- Herkes push token ekleyebilir/güncelleyebilir (kullanıcıya bağlı değil)
CREATE POLICY "Herkes push token ekleyebilir" ON public.push_tokens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Herkes push token güncelleyebilir" ON public.push_tokens
  FOR UPDATE
  USING (true);

-- Yorumlar
COMMENT ON TABLE public.push_tokens IS 'Push notification token''ları - cihaz bazlı token yönetimi';
COMMENT ON COLUMN public.push_tokens.push_token IS 'Expo push token (ExponentPushToken[...] formatında)';
COMMENT ON COLUMN public.push_tokens.device_info IS 'Cihaz bilgileri JSON: platform, model, osVersion, etc.';
COMMENT ON COLUMN public.push_tokens.device_id IS 'Benzersiz cihaz tanımlayıcısı';
COMMENT ON COLUMN public.push_tokens.last_active IS 'Son aktiflik zamanı - token kullanımını takip etmek için';

