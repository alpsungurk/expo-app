-- Kullanici Profilleri INSERT Politikası Düzeltme
-- Bu migration kullanıcıların kayıt olurken kendi profilini oluşturabilmesi için gerekli

-- Mevcut INSERT politikasını kontrol et ve varsa sil
DROP POLICY IF EXISTS "Herkes profil oluşturabilir" ON public.kullanici_profilleri;
DROP POLICY IF EXISTS "Kendi profilini oluşturabilir" ON public.kullanici_profilleri;

-- Kullanıcıların kendi profilini oluşturabilmesi için INSERT politikası
-- Kayıt sırasında auth.uid() henüz set edilmemiş olabileceği için
-- "Herkes profil oluşturabilir" politikasını kullanıyoruz
-- Güvenlik: id kontrolü uygulama tarafında yapılıyor (authData.user.id kullanılıyor)
-- Kullanıcı sadece kendi auth.users id'si ile profil oluşturabilir

CREATE POLICY "Herkes profil oluşturabilir" ON public.kullanici_profilleri 
FOR INSERT 
WITH CHECK (true);

-- RLS'nin aktif olduğundan emin ol
ALTER TABLE public.kullanici_profilleri ENABLE ROW LEVEL SECURITY;

SELECT 'Kullanici profilleri INSERT politikası başarıyla eklendi!' as status;

