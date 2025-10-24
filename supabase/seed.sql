-- Supabase Seed Data Dosyası
-- Bu dosya veritabanına örnek veriler eklemek için kullanılır

-- 1. Roller
-- ==========
INSERT INTO public.roller (id, ad) VALUES 
(1, 'admin'),
(2, 'kullanici'),
(3, 'garson')
ON CONFLICT (id) DO NOTHING;

-- 2. Kategoriler
-- ===============
INSERT INTO public.kategoriler (id, ad, icon, aktif, sira_no) VALUES 
(1, 'Ana Yemekler', '🍽️', true, 1),
(2, 'İçecekler', '🥤', true, 2),
(3, 'Tatlılar', '🍰', true, 3),
(4, 'Atıştırmalıklar', '🍿', true, 4),
(5, 'Kahvaltı', '🥞', true, 5)
ON CONFLICT (id) DO NOTHING;

-- 3. Kampanya Türleri
-- ====================
INSERT INTO public.kampanya_turleri (id, ad, aciklama, aktif) VALUES 
(1, 'İndirim Kampanyası', 'Ürünlere özel indirim kampanyaları', true),
(2, 'Yeni Ürün Tanıtımı', 'Yeni ürünlerin tanıtım kampanyaları', true),
(3, 'Sezonluk Kampanya', 'Mevsimsel özel kampanyalar', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Masalar
-- ===========
INSERT INTO public.masalar (id, masa_no, qr_token, aktif) VALUES 
(1, 'M1', 'masa_1_token_123', true),
(2, 'M2', 'masa_2_token_456', true),
(3, 'M3', 'masa_3_token_789', true),
(4, 'M4', 'masa_4_token_101', true),
(5, 'M5', 'masa_5_token_112', true),
(6, 'M6', 'masa_6_token_131', true),
(7, 'M7', 'masa_7_token_415', true),
(8, 'M8', 'masa_8_token_161', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Sistem Ayarları
-- ===================
INSERT INTO public.sistem_ayarlari (id, anahtar, deger) VALUES 
(1, 'restoran_adi', 'Lezzet Durağı'),
(2, 'restoran_telefon', '+90 555 123 45 67'),
(3, 'restoran_adres', 'Merkez Mahallesi, Lezzet Sokak No:1'),
(4, 'min_siparis_tutari', '50'),
(5, 'teslimat_suresi', '30'),
(6, 'para_birimi', 'TL'),
(7, 'vergi_orani', '18')
ON CONFLICT (id) DO NOTHING;

-- 6. Ürünler
-- ===========
INSERT INTO public.urunler (id, kategori_id, ad, aciklama, fiyat, aktif, populer, yeni_urun, hazirlanma_suresi, sira_no, resim_path) VALUES 
-- Ana Yemekler
(1, 1, 'Adana Kebap', 'Acılı kıyma ile hazırlanan geleneksel Adana kebabı', 85.00, true, true, false, 15, 1, '/images/adana-kebap.jpg'),
(2, 1, 'Urfa Kebap', 'Acısız kıyma ile hazırlanan Urfa kebabı', 85.00, true, true, false, 15, 2, '/images/urfa-kebap.jpg'),
(3, 1, 'Tavuk Şiş', 'Marine edilmiş tavuk göğsü', 75.00, true, false, false, 12, 3, '/images/tavuk-sis.jpg'),
(4, 1, 'Kuzu Pirzola', 'Taze kuzu pirzolası', 120.00, true, false, true, 20, 4, '/images/kuzu-pirzola.jpg'),
(5, 1, 'Balık Tava', 'Günlük taze balık', 95.00, true, false, false, 18, 5, '/images/balik-tava.jpg'),

-- İçecekler
(6, 2, 'Ayran', 'Ev yapımı ayran', 8.00, true, true, false, 2, 1, '/images/ayran.jpg'),
(7, 2, 'Çay', 'Demli çay', 5.00, true, true, false, 3, 2, '/images/cay.jpg'),
(8, 2, 'Kahve', 'Türk kahvesi', 12.00, true, false, false, 5, 3, '/images/kahve.jpg'),
(9, 2, 'Kola', 'Soğuk kola', 10.00, true, false, false, 1, 4, '/images/kola.jpg'),
(10, 2, 'Su', 'Doğal kaynak suyu', 3.00, true, true, false, 1, 5, '/images/su.jpg'),

-- Tatlılar
(11, 3, 'Baklava', 'Antep fıstıklı baklava', 25.00, true, true, false, 5, 1, '/images/baklava.jpg'),
(12, 3, 'Künefe', 'Peynirli künefe', 30.00, true, true, false, 8, 2, '/images/kunefe.jpg'),
(13, 3, 'Sütlaç', 'Ev yapımı sütlaç', 15.00, true, false, false, 3, 3, '/images/sutlac.jpg'),
(14, 3, 'Dondurma', 'Vanilyalı dondurma', 12.00, true, false, false, 2, 4, '/images/dondurma.jpg'),

-- Atıştırmalıklar
(15, 4, 'Patates Kızartması', 'Taze patates kızartması', 18.00, true, false, false, 8, 1, '/images/patates-kizartmasi.jpg'),
(16, 4, 'Soğan Halkası', 'Kızarmış soğan halkası', 22.00, true, false, false, 10, 2, '/images/sogan-halkasi.jpg'),
(17, 4, 'Mozzarella Çubukları', 'Kızarmış mozzarella çubukları', 28.00, true, false, true, 12, 3, '/images/mozzarella-cubuklari.jpg'),

-- Kahvaltı
(18, 5, 'Menemen', 'Domates, biber ve yumurta', 35.00, true, true, false, 10, 1, '/images/menemen.jpg'),
(19, 5, 'Omlet', 'Çeşitli malzemeli omlet', 30.00, true, false, false, 8, 2, '/images/omlet.jpg'),
(20, 5, 'Tost', 'Peynirli tost', 20.00, true, false, false, 5, 3, '/images/tost.jpg')
ON CONFLICT (id) DO NOTHING;

-- 7. Ürün Özelleştirme
-- =====================
INSERT INTO public.urun_ozellestirme (id, urun_id, secenek_adi, secenek_tipi, zorunlu, sira_no) VALUES 
-- Kebap özelleştirmeleri
(1, 1, 'Acılık Seviyesi', 'radio', false, 1),
(2, 2, 'Acılık Seviyesi', 'radio', false, 1),
(3, 1, 'Ekstra Malzemeler', 'checkbox', false, 2),
(4, 2, 'Ekstra Malzemeler', 'checkbox', false, 2),

-- İçecek özelleştirmeleri
(5, 6, 'Buzlu/Acısız', 'radio', false, 1),
(6, 7, 'Şekerli/Şekersiz', 'radio', false, 1),
(7, 8, 'Şekerli/Şekersiz', 'radio', false, 1)
ON CONFLICT (id) DO NOTHING;

-- 8. Özelleştirme Değerleri
-- ==========================
INSERT INTO public.ozellestirme_degerleri (id, ozellestirme_id, deger_adi, ek_fiyat, aktif, sira_no) VALUES 
-- Acılık seviyeleri
(1, 1, 'Az Acılı', 0, true, 1),
(2, 1, 'Orta Acılı', 0, true, 2),
(3, 1, 'Çok Acılı', 0, true, 3),
(4, 2, 'Az Acılı', 0, true, 1),
(5, 2, 'Orta Acılı', 0, true, 2),
(6, 2, 'Çok Acılı', 0, true, 3),

-- Ekstra malzemeler
(7, 3, 'Ekstra Soğan', 5, true, 1),
(8, 3, 'Ekstra Domates', 5, true, 2),
(9, 3, 'Ekstra Biber', 5, true, 3),
(10, 4, 'Ekstra Soğan', 5, true, 1),
(11, 4, 'Ekstra Domates', 5, true, 2),
(12, 4, 'Ekstra Biber', 5, true, 3),

-- İçecek özelleştirmeleri
(13, 5, 'Buzlu', 0, true, 1),
(14, 5, 'Acısız', 0, true, 2),
(15, 6, 'Şekerli', 0, true, 1),
(16, 6, 'Şekersiz', 0, true, 2),
(17, 7, 'Şekerli', 0, true, 1),
(18, 7, 'Şekersiz', 0, true, 2)
ON CONFLICT (id) DO NOTHING;

-- 9. Ürün Malzemeleri
-- ====================
INSERT INTO public.urun_malzemeleri (id, urun_id, malzeme_adi, sira_no) VALUES 
(1, 1, 'Kıyma', 1),
(2, 1, 'Soğan', 2),
(3, 1, 'Domates', 3),
(4, 1, 'Biber', 4),
(5, 2, 'Kıyma', 1),
(6, 2, 'Soğan', 2),
(7, 2, 'Domates', 3),
(8, 2, 'Biber', 4),
(9, 3, 'Tavuk Göğsü', 1),
(10, 3, 'Zeytinyağı', 2),
(11, 3, 'Baharatlar', 3)
ON CONFLICT (id) DO NOTHING;

-- 10. Ürün Alerjenleri
-- =====================
INSERT INTO public.urun_alerjenleri (id, urun_id, alerjen_adi, sira_no) VALUES 
(1, 1, 'Gluten', 1),
(2, 1, 'Süt', 2),
(3, 2, 'Gluten', 1),
(4, 2, 'Süt', 2),
(5, 3, 'Süt', 1),
(6, 4, 'Süt', 1),
(7, 5, 'Balık', 1),
(8, 6, 'Süt', 1),
(9, 8, 'Süt', 1),
(10, 11, 'Gluten', 1),
(11, 11, 'Fıstık', 2),
(12, 12, 'Gluten', 1),
(13, 12, 'Süt', 2),
(14, 13, 'Süt', 1),
(15, 14, 'Süt', 1),
(16, 15, 'Gluten', 1),
(17, 16, 'Gluten', 1),
(18, 17, 'Süt', 1),
(19, 18, 'Yumurta', 1),
(20, 19, 'Yumurta', 1),
(21, 20, 'Gluten', 1),
(22, 20, 'Süt', 2)
ON CONFLICT (id) DO NOTHING;

-- 11. Kampanyalar
-- ================
INSERT INTO public.kampanyalar (id, ad, aciklama, baslangic_tarihi, bitis_tarihi, aktif, resim_path, kampanya_turu_id, kampanya_aciklama) VALUES 
(1, 'Kebap Günleri', 'Tüm kebap çeşitlerinde %20 indirim', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true, '/images/kebap-gunleri.jpg', 1, 'Hafta içi tüm kebap çeşitlerinde özel indirim'),
(2, 'Yeni Ürün Tanıtımı', 'Kuzu Pirzola ve Mozzarella Çubukları tanıtımı', '2024-01-15 00:00:00', '2024-02-15 23:59:59', true, '/images/yeni-urunler.jpg', 2, 'Yeni eklenen ürünlerimizi deneyin'),
(3, 'Kahvaltı Kampanyası', 'Kahvaltı menüsünde %15 indirim', '2024-01-01 00:00:00', '2024-03-31 23:59:59', true, '/images/kahvalti-kampanyasi.jpg', 1, 'Sabah saatlerinde özel fiyatlar')
ON CONFLICT (id) DO NOTHING;

-- 12. İndirimler
-- ===============
INSERT INTO public.indirimler (id, kampanya_id, indirim_tipi, indirim_degeri, minimum_tutar, maksimum_indirim, aktif) VALUES 
(1, 1, 'yuzde', 20, 50, 50, true),
(2, 2, 'miktar', 10, 30, 20, true),
(3, 3, 'yuzde', 15, 25, 30, true)
ON CONFLICT (id) DO NOTHING;

-- 13. Kampanya Ürünleri
-- ======================
INSERT INTO public.kampanya_urunleri (id, kampanya_id, urun_id, kategori_id) VALUES 
(1, 1, 1, 1), -- Adana Kebap
(2, 1, 2, 1), -- Urfa Kebap
(3, 2, 4, 1), -- Kuzu Pirzola
(4, 2, 17, 4), -- Mozzarella Çubukları
(5, 3, 18, 5), -- Menemen
(6, 3, 19, 5), -- Omlet
(7, 3, 20, 5)  -- Tost
ON CONFLICT (id) DO NOTHING;

-- 14. Duyurular
-- ==============
INSERT INTO public.duyurular (id, baslik, icerik, resim_path, baslangic_tarihi, bitis_tarihi, aktif, oncelik, duyuru_aciklama) VALUES 
(1, 'Yeni Menü Eklendi!', 'Lezzet durağımıza yeni ürünler eklendi. Kuzu pirzola ve mozzarella çubukları artık menümüzde!', '/images/yeni-menu.jpg', '2024-01-15 00:00:00', '2024-02-15 23:59:59', true, 1, 'Yeni ürünlerimizi deneyin'),
(2, 'Kebap Günleri Başladı', 'Hafta içi tüm kebap çeşitlerinde %20 indirim fırsatı!', '/images/kebap-gunleri.jpg', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true, 2, 'Özel indirim fırsatı'),
(3, 'Kahvaltı Saatleri', 'Kahvaltı servisimiz 07:00-11:00 saatleri arasında', '/images/kahvalti-saatleri.jpg', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true, 3, 'Kahvaltı saatleri bilgisi')
ON CONFLICT (id) DO NOTHING;

-- 15. Yeni Öneriler
-- ==================
INSERT INTO public.yeni_oneriler (id, urun_id, baslik, aciklama, resim_path, baslangic_tarihi, bitis_tarihi, aktif) VALUES 
(1, 4, 'Kuzu Pirzola', 'Taze kuzu pirzolası, özel baharatlarla marine edilmiş', '/images/kuzu-pirzola-oneri.jpg', '2024-01-15 00:00:00', '2024-02-15 23:59:59', true),
(2, 17, 'Mozzarella Çubukları', 'Kızarmış mozzarella çubukları, çıtır dış kabuk', '/images/mozzarella-cubuklari-oneri.jpg', '2024-01-15 00:00:00', '2024-02-15 23:59:59', true),
(3, 1, 'Adana Kebap', 'Geleneksel Adana kebabı, acılı kıyma ile', '/images/adana-kebap-oneri.jpg', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true)
ON CONFLICT (id) DO NOTHING;

-- 16. Bildirimler
-- ================
INSERT INTO public.bildirimler (id, baslik, icerik, tip, aktif, olusturma_tarihi, hedef, hedef_id) VALUES 
(1, 'Hoş Geldiniz!', 'Lezzet Durağına hoş geldiniz. Menümüzü inceleyebilir ve sipariş verebilirsiniz.', 'genel', true, CURRENT_TIMESTAMP, 'tum', NULL),
(2, 'Yeni Ürünler', 'Menümüze yeni ürünler eklendi. Kuzu pirzola ve mozzarella çubukları artık sipariş verebilirsiniz.', 'urun', true, CURRENT_TIMESTAMP, 'tum', NULL),
(3, 'Kampanya Hatırlatması', 'Kebap günleri devam ediyor! %20 indirim fırsatını kaçırmayın.', 'kampanya', true, CURRENT_TIMESTAMP, 'tum', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed data tamamlandı
SELECT 'Seed data başarıyla eklendi!' as status;
