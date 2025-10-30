drop trigger if exists "trigger_calculate_siparis_detay_total" on "public"."siparis_detaylari";

drop trigger if exists "trigger_update_siparis_total" on "public"."siparis_detaylari";

drop trigger if exists "trigger_set_siparis_no" on "public"."siparisler";

drop policy "Herkes bildirim güncelleyebilir" on "public"."bildirimler";

drop policy "Herkes bildirim oluşturabilir" on "public"."bildirimler";

drop policy "Herkes bildirim silebilir" on "public"."bildirimler";

drop policy "Herkes profil oluşturabilir" on "public"."kullanici_profilleri";

drop policy "Kendi profilini güncelleyebilir" on "public"."kullanici_profilleri";

drop policy "Kendi profilini okuyabilir" on "public"."kullanici_profilleri";

drop policy "Admin performans istatistiklerini okuyabilir" on "public"."performans_istatistikleri";

drop policy "Herkes performans istatistiği güncelleyebilir" on "public"."performans_istatistikleri";

drop policy "Herkes performans istatistiği oluşturabilir" on "public"."performans_istatistikleri";

drop policy "Herkes performans istatistiği silebilir" on "public"."performans_istatistikleri";

drop policy "Sipariş detaylarını okuyabilir" on "public"."siparis_detaylari";

drop policy "Sipariş detayı oluşturabilir" on "public"."siparis_detaylari";

drop policy "Sipariş detayı silebilir" on "public"."siparis_detaylari";

drop policy "Sipariş güncelleyebilir" on "public"."siparisler";

drop policy "Sipariş oluşturabilir" on "public"."siparisler";

drop policy "Sipariş silebilir" on "public"."siparisler";

drop policy "Siparişleri okuyabilir" on "public"."siparisler";

drop policy "Herkes sistem ayarı güncelleyebilir" on "public"."sistem_ayarlari";

drop policy "Herkes sistem ayarı oluşturabilir" on "public"."sistem_ayarlari";

drop policy "Herkes sistem ayarı silebilir" on "public"."sistem_ayarlari";

drop policy "Herkes okuyabilir" on "public"."bildirimler";

drop policy "Herkes okuyabilir" on "public"."duyurular";

drop policy "Herkes okuyabilir" on "public"."indirimler";

drop policy "Herkes okuyabilir" on "public"."kampanya_turleri";

drop policy "Herkes okuyabilir" on "public"."kampanyalar";

drop policy "Herkes okuyabilir" on "public"."kategoriler";

drop policy "Herkes okuyabilir" on "public"."masalar";

drop policy "Herkes okuyabilir" on "public"."ozellestirme_degerleri";

drop policy "Herkes okuyabilir" on "public"."urunler";

drop policy "Herkes okuyabilir" on "public"."yeni_oneriler";

alter table "public"."indirimler" drop constraint "indirimler_indirim_tipi_check";

alter table "public"."siparisler" drop constraint "siparisler_durum_check";

alter sequence "public"."bildirimler_id_seq" owned by none;

alter sequence "public"."duyurular_id_seq" owned by none;

alter sequence "public"."indirimler_id_seq" owned by none;

alter sequence "public"."kampanya_turleri_id_seq" owned by none;

alter sequence "public"."kampanya_urunleri_id_seq" owned by none;

alter sequence "public"."kampanyalar_id_seq" owned by none;

alter sequence "public"."kategoriler_id_seq" owned by none;

alter sequence "public"."masalar_id_seq" owned by none;

alter sequence "public"."ozellestirme_degerleri_id_seq" owned by none;

alter sequence "public"."performans_istatistikleri_id_seq" owned by none;

alter sequence "public"."roller_id_seq" owned by none;

alter sequence "public"."siparis_detaylari_id_seq" owned by none;

alter sequence "public"."siparisler_id_seq" owned by none;

alter sequence "public"."sistem_ayarlari_id_seq" owned by none;

alter sequence "public"."urun_alerjenleri_id_seq" owned by none;

alter sequence "public"."urun_malzemeleri_id_seq" owned by none;

alter sequence "public"."urun_ozellestirme_id_seq" owned by none;

alter sequence "public"."urunler_id_seq" owned by none;

alter sequence "public"."yeni_oneriler_id_seq" owned by none;

CREATE INDEX idx_bildirimler_tip ON public.bildirimler USING btree (tip);

CREATE INDEX idx_duyurular_oncelik ON public.duyurular USING btree (oncelik DESC);

CREATE INDEX idx_duyurular_tarih ON public.duyurular USING btree (baslangic_tarihi, bitis_tarihi);

CREATE INDEX idx_kampanyalar_tarih ON public.kampanyalar USING btree (baslangic_tarihi, bitis_tarihi);

CREATE INDEX idx_kategoriler_aktif ON public.kategoriler USING btree (aktif);

CREATE INDEX idx_masalar_aktif ON public.masalar USING btree (aktif);

CREATE INDEX idx_performans_istatistikleri_tarih ON public.performans_istatistikleri USING btree (tarih);

CREATE INDEX idx_siparis_detaylari_urun_id ON public.siparis_detaylari USING btree (urun_id);

CREATE INDEX idx_siparisler_olusturma_tarihi ON public.siparisler USING btree (olusturma_tarihi);

CREATE INDEX idx_urunler_populer ON public.urunler USING btree (populer);

CREATE INDEX idx_urunler_yeni_urun ON public.urunler USING btree (yeni_urun);

CREATE INDEX idx_yeni_oneriler_aktif ON public.yeni_oneriler USING btree (aktif);

CREATE INDEX idx_yeni_oneriler_tarih ON public.yeni_oneriler USING btree (baslangic_tarihi, bitis_tarihi);

alter table "public"."indirimler" add constraint "indirimler_indirim_tipi_check" CHECK (((indirim_tipi)::text = ANY (ARRAY[('yuzde'::character varying)::text, ('miktar'::character varying)::text]))) not valid;

alter table "public"."indirimler" validate constraint "indirimler_indirim_tipi_check";

alter table "public"."siparisler" add constraint "siparisler_durum_check" CHECK (((durum)::text = ANY (ARRAY[('beklemede'::character varying)::text, ('hazirlaniyor'::character varying)::text, ('hazir'::character varying)::text, ('teslim_edildi'::character varying)::text, ('iptal'::character varying)::text]))) not valid;

alter table "public"."siparisler" validate constraint "siparisler_durum_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id integer)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    total numeric := 0;
BEGIN
    SELECT COALESCE(SUM(toplam_fiyat), 0) INTO total
    FROM public.siparis_detaylari
    WHERE siparis_id = order_id;
    
    RETURN total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.siparisler
    SET toplam_tutar = calculate_order_total(COALESCE(NEW.siparis_id, OLD.siparis_id))
    WHERE id = COALESCE(NEW.siparis_id, OLD.siparis_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

create policy "Herkes okuyabilir"
on "public"."kullanici_profilleri"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."performans_istatistikleri"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."siparis_detaylari"
as permissive
for select
to public
using (true);


create policy "Herkes siparis detaylarini silebilir"
on "public"."siparis_detaylari"
as permissive
for delete
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."siparisler"
as permissive
for select
to public
using (true);


create policy "Herkes siparisleri guncelleyebilir"
on "public"."siparisler"
as permissive
for update
to public
using (true);


create policy "Herkes siparisleri silebilir"
on "public"."siparisler"
as permissive
for delete
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."bildirimler"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."duyurular"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."indirimler"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."kampanya_turleri"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."kampanyalar"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."kategoriler"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."masalar"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."ozellestirme_degerleri"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."urunler"
as permissive
for select
to public
using (true);


create policy "Herkes okuyabilir"
on "public"."yeni_oneriler"
as permissive
for select
to public
using (true);



