# AtlasAI uygulama ve kontrol notu

Tarih: 14 Eylül 2026. Çalışma ağacındaki mevcut AtlasAI temeli ve diğer değişiklikler korunarak geliştirildi. Bu çalışma kaynak kodu entegrasyonudur; üretim yayını yapılmadı.

## Uygulanan sistem

| Katman | Uygulama |
| --- | --- |
| Ortak model | `packages/shared/src/atlas-ai.ts`: öğrenci ölçümü, konu önceliği, ders/randevu saatleri, haftalık plan sözleşmeleri |
| Ölçüm | `apps/api/src/atlas-ai/atlas-ai.analytics.ts`: İstanbul takvim ayı, önceki ay karşılaştırması, soru bazlı doğrulama, yetkili öğrenci seçimi |
| Plan | `atlas-ai.planner.ts`: konu önceliği, ödevler, molalar, aralıklı tekrar, haftalık ve tekil derslerden boş saatler |
| Sohbet | `atlas-ai.service.ts`: taze kimlik ve kapsam kontrolü, gerçek ölçümlerin modele verilmesi, panel bağlantıları |
| Ürün bilgisi | `atlas-ai.knowledge.ts`: mevcut panel menüleri ve destek ekranlarından role uygun kullanım rehberi |
| OpenAI | `apps/api/src/gamification/ai.service.ts`: Responses API, fotoğraflı devam sorusu, ayrı görsel üretimi, doğrulanmış PNG yanıtı |
| Arayüz | `apps/web/src/components/atlas-ai/`: üç çalışma alanı, maskot, ses, iptal/yeniden deneme, gelişim kartları ve plan takibi |
| Dışa aktarma | `atlas-plan-calendar.ts`: Türkiye saat diliminde, Türkçe metni koruyan `.ics` dosyası |

## Yapılan doğrulama

- **API: 9 test grubu, 126 test başarılı.** JWT ve rol kapsamı; aile/öğretmen sınırları; sınıf–ders çiftleri; ortak okul Wi-Fi; ayrı görsel kotası; sahte geçmiş rolleri; görsel dosya sınırları; sağlayıcı hataları ve ret yanıtları; takvim ayı; değişmiş soru/testler; plan süreleri, molalar ve tekil canlı dersler.
- **API üretim derlemesi başarılı.** Kaynak ve test dosyaları TypeScript kontrolünden geçti.
- **Web üretim derlemesi başarılı:** `next build --webpack`; 61 sayfa üretildi. Web TypeScript kontrolü başarılı.
- **Kilit dosyası doğrulandı:** projenin istediği pnpm 10.2.0 ile `install --frozen-lockfile --lockfile-only --ignore-scripts` başarılı. Mevcut bağımlılıklar yeniden kurulmadı; yerel web doğrulaması kurulu Next.js 16.1.6 ile yapıldı. Manifestteki sürümle aynı ortamı elde etmek için yayında normal `pnpm install --frozen-lockfile` çalıştırılmalıdır.
- **Masaüstü tarayıcı testi:** yapay test hesabıyla AtlasAI ekranı, konu kartları, gerçek planlayıcının ürettiği yedi günlük plan, sohbet, hata sonrası taslak koruma, iptal ve görsel yanıtın indirme bağlantısı kontrol edildi. Bunlar model kalitesini veya gerçek öğrenci verisini temsil eden testler değildir.
- **Takvim denetimi:** saat dilimi, etkinlik süreleri, molaların hariç tutulması, metin kaçışları ve Türkçe UTF-8 satır katlama doğrulandı.
- **Yerel başlangıç:** eski Turbopack önbelleği bozuk olduğu için kayıpsız yedeklendi. Yeni önbellekle varsayılan `next dev` açıldı. Önizleme/test sunucuları çalışma sonunda kapatıldı.

Masaüstü kontrolünde bulunan maskot yükleme, karşılama alanının başlangıç kaydırması ve iptal düğmesinin yeniden gönderim davranışı düzeltildi. Son mobil/veli tarayıcı turu, tarayıcının yönetici erişim politikasını doğrulayamaması nedeniyle tamamlanamadı. Mobil stiller mevcut; bu tur için görsel onay iddiası yoktur. Backend veli ve öğretmen kapsam testleri geçti.

Web derlemesinde mevcut ana sayfanın eğitim paketi sorgusu yerel API çalışmadığından `ECONNREFUSED` uyarısı verdi; sayfa üretimi ve derleme yine başarıyla tamamlandı. Bu uyarı AtlasAI sağlayıcı testi değildir.

## Canlı bağlantı için

1. API sunucusuna `OPENAI_API_KEY` ekleyin. Anahtarı sohbet, git veya `NEXT_PUBLIC_` değişkenlerine koymayın.
2. `OPENAI_MODEL` ve `OPENAI_IMAGE_MODEL` erişimlerini OpenAI projenizde doğrulayın. Varsayılanlar ve kapatma anahtarı `.env.example` ile `render.yaml` içinde hazırdır.
3. API ve web uygulamalarını kurulum rehberindeki sırayla derleyip dağıtın.
4. Gerçek yetkili hesaplarla `/atlas-ai/status`, basit metin sorusu, fotoğraflı soru/devam sorusu, bir eğitim görseli, gelişim ve plan akışını deneyin.

Bu çalışma sırasında yerel OpenAI anahtarı bulunmadığından **gerçek OpenAI çağrısı, model erişimi/kotası ve canlı MongoDB veri akışı doğrulanmadı**. Testler gerçek servise para harcamayan kontrollü yanıtlar ve sorgu örnekleriyle yapıldı.

## Ürün sınırları

Ses şu anda cihaz/tarayıcı seslendirmesidir; maskot CSS hareketleri kullanır. Doğal OpenAI Realtime ses ve ağız senkronu ayrı bir geliştirmedir. Plan ve sohbet tarayıcı oturumuna aittir; cihazlar arası kalıcı hafıza yoktur. Test tekrarları mevcut veritabanında önceki denemeyi güncellediği için aylık karşılaştırma bütün deneme geçmişi değildir. Ölçüm kapsamı ve sonraki geliştirmeler [AtlasAI rehberinde](atlas-ai.md) açıklanmıştır.
