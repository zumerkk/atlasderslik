# AtlasAI yerel geliştirme ve doğrulama — 20 Eylül 2026

## Bu turdaki geliştirmeler

- Haftalık plan ve tamamlanan çalışmalar MongoDB'de hesap/öğrenci bazında saklanır. Sayfa yenileme, yeniden giriş ve uygulama yeniden başlatma sonrası geri yüklenir.
- “Bugünün odağı” sıradaki çalışmayı, işaretlenen adımları ve sürelerini gösterir. “Atlas ile çalış” seçili konu ve etkinlikle sohbeti başlatır.
- İlerleme kaydı sırasında bekleme durumu; hatada geri alma ve yeniden deneme; eski plan sürümünde güncel kaydı yükleme vardır. Başka öğrencinin/hesabın geç gelen yanıtı ekrana taşınmaz.
- Kayıtlı planlar güncel erişim kapsamıyla kontrol edilir. Öğretmenin ders yetkisi değişirse eski kapsamı içeren plan gösterilmez. Benzersiz kayıt indeksi ve atomik ilerleme güncellemeleri eşzamanlı istekleri korur.
- Modelin `focus` gibi iç veri değerlerini kullanıcıya göstermemesi için Türkçe anlatım kuralı eklendi.

## Gerçek yerel kurulum

`npm run local`, MongoDB 8.2.6, NestJS API ve Next.js web uygulamasını başlatır. Web adresi `http://localhost:3000/login`; API `127.0.0.1:3001`, veritabanı `127.0.0.1:27017/atlas_local`. Servisler yalnızca bu bilgisayara bağlanır.

Veritabanı `.atlas-local/data` içinde kalıcıdır. `npm run local:stop` verileri silmeden kapatır. `npm run local:status` hazır olma durumunu gösterir. İlk başlangıçta indirilen çalıştırıcı, günlükler ve deneme şifreleri `.atlas-local` içinde sürüm kontrolü dışında kalır. Gerçek proje `.env` dosyasındaki veritabanı kullanılmaz; ödeme bağlantısı yerel çalıştırıcıda kapalıdır.

Bu kurulum gerçek kimlik doğrulaması, API ve MongoDB kullanır. Eski `.codex_artifacts/atlasai-qa-server.cjs` fixture servisi çalıştırılmadı. Eğitim kayıtları kurgusaldır; öğrenci, veli, öğretmen ve admin hesapları ve parolaların konumu [yerel kurulum rehberinde](atlas-local-seed.md) açıklanır.

## Doğrulanan davranışlar

- 10 API test takımı, 143 test geçti. Yeni kontroller hesap ayrımı, yetki değişikliği, atomik kayıt, aynı işlemin tekrarı, mola/geçersiz adım reddi ve eski plan sürümü çakışmasını kapsar.
- Ön yüz TypeScript ve ilgili dosyaların ESLint kontrolü başarılı. Geçici hook kontrolünde 12 durum (hesap/öğrenci değişimi, geç yanıtlar, hata/yeniden deneme, hızlı çift tıklama, İstanbul gün sınırı dahil) geçti.
- API üretim derlemesi ve web üretim derlemesi (`next build --webpack`, 61 sayfa) başarılı. Kontrol edilen kurulu web sürümü Next.js 16.1.6 / React 19.2.3; manifestteki daha yeni sürümler bu turda yeniden yüklenmedi. Web derlemesi sırasında API kapalı olduğundan ana sayfa paket isteği bağlantı uyarısı verdi; uygulama bu durumu yakalayıp derlemeyi tamamladı.
- Dört hesabın gerçek API girişi ve yetkili öğrenci analizi başarılı. Öğrenci, veli, öğretmen ve admin panelleri tarayıcıda açıldı; AtlasAI bağlantısı ve köşe asistanı göründü.
- Öğrenci hesabında tarayıcıdan 7 günlük, 15 çalışma adımlı plan oluşturuldu. Bir adım işaretlenip sayfa yenilendiğinde aynı işaret geri yüklendi. Yeni girişle API'den de aynı plan ve ilerleme okundu.
- Yerel servisler kapatılıp yeniden başlatıldı; önceki plan, tamamlanan adım ve kayıt zamanı birebir korundu. Son kontrolde web 200, veritabanı bağlantısı `connected`, kurulum durumu `ready` döndü.
- Başka hesabın planına ilerleme yazma reddedildi; yetkisiz öğrenci seçimi 403, mola işaretleme 400 döndürdü. Aynı adımı iki eşzamanlı istekle işaretlemek çift kayıt üretmedi.
- 390×844 telefon görünümünde plan kontrolleri ve bugünün odağı incelendi; yatay taşma görülmedi. Test sonrası ekran boyutu varsayılana döndürüldü.
- Seed yeniden çalıştırıldı: bütün mevcut belgeler, kullanıcı parola hashleri ve parola dosyası korundu. 78 örnek belge uygulama şemalarıyla doğrulandı; uzak ve yanlış veritabanı adresleri reddedildi.
- Gerçek model çağrısında 3/4 + 1/8 sorusu 7/8 olarak adımlı çözüldü. Hesap bağlamlı istekte bu ayki 4 test, 70,8 puan ve kesirlerdeki %40 doğruluk kayıtlarla eşleşti.

## Dış bağlantılar ve sınırlar

Yerel ortamda OpenAI anahtarı bulunmuyor. Mevcut Hugging Face bağlantısı metin sorularını yanıtladı; öncelikli Groq isteği 404 döndürdü ve mevcut yedek sağlayıcıya geçildi. OpenAI fotoğraf çözümü ve görsel üretimi için API sunucusuna geçerli `OPENAI_API_KEY` eklenmesi ve gerçek çağrı yapılması gerekir; bu iki özellik bu turda canlı doğrulanmadı.

Ölçümler örnek yerel kayıtlardan hesaplanır; tamamlanan dakika, kullanıcının işaretlediği plan süresidir ve gerçek çalışma süresi ölçümü değildir. Ses ve maskot mevcut tarayıcı sesi/CSS hareketlerini kullanır. Bu çalışma yayın ortamına dağıtılmadı.
