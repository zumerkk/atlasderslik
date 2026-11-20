En güncel sürüm ve doğrulama: [20 Kasım 2026 AtlasAI raporu](atlas-ai-release-2026-11-20.md).

# AtlasAI

AtlasAI; öğrenci, öğretmen, veli ve yönetici panellerinde çalışan, Atlas maskotuyla sunulan eğitim asistanıdır. Her panelin menüsündeki **AtlasAI** sayfasından veya sağ alttaki maskottan açılır.

## Öğrenme çalışma alanı

AtlasAI artık **Sohbet**, **Gelişimim / Öğrenci gelişimi** ve **Çalışma planım / Çalışma planı** ve **PDF materyaller** alanlarını içerir. Panellerdeki mevcut Atlas karakteri kullanılır. Köşe maskotu oturum başına bir kez karşılar; bekleme, düşünme, dinleme ve konuşma hareketleri gösterir.

- **Bu ay ne yaptım?** İstanbul takvim ayına göre tamamlanan test, teslim edilen ödev, ortalama puan ve önceki aya göre puan farkı veritabanında hesaplanır. Eksik puan sıfır diye gösterilmez.
- **Nerede eksiğim var?** Öğrencinin işaretlediği yanıtlar soruların ders/konu eşleşmeleriyle değerlendirilir. Doğru, yanlış, boş, doğruluk oranı ve ölçümün güveni gösterilir. Az sayıda sorudan kesin bir konu eksiği iddiası üretilmez.
- **Bana plan çıkar.** Günlük süre ve başlangıç saatinden yedi günlük, molalı bir program çıkar. Öncelikli konular, yaklaşan ödevler ve 1/3/6 gün aralıklı tekrarlar kullanılır. Haftalık program ve tekil canlı ders randevularıyla çakışma önlenir; geçmiş saatlere veya 21.30 sonrasına çalışma yazılmaz. Uygun süre yoksa plan kısalır ve gerekçesi görünür.
- **Çalışmayı takip et.** Plan ve tamamlanan adımlar MongoDB'de hesap/öğrenci bazında saklanır; yeniden girişte geri yüklenir. “Bugünün odağı” sıradaki çalışmayı ve işaretlenen süreyi gösterir. Kayıt hatasında işaret geri alınır ve yeniden deneme sunulur. `.ics` indirmesi Türkiye saat diliminde kişisel takvime aktarılabilir.
- **Görsel oluştur.** Sohbet oluşturucusundaki ayrı moddan fen şeması, kavram haritası veya öğrenme illüstrasyonu istenir. Gerçek OpenAI görsel aracı çağrılır; dönen PNG görüntülenir ve indirilebilir.

Gelişim ölçümleri bir modelin sayı tahminine bağlı değildir; **AI anahtarı olmasa da** yetkili veritabanı kayıtlarıyla çalışır. Deterministik çalışma planı için öğrencinin güncel müfredatının ayrıca onaylanmış olması gerekir. Model bu ölçümleri sohbet içinde açıklar ve soru çözer. Model çıktıları not, ödeme, kayıt veya öğretmen programını değiştirmez.

## Sohbet ve erişim

- Çok turlu Türkçe sohbet, adım adım soru çözümü ve çalışma planı önerileri.
- Öğrenciye kendi ödevleri, sonuçları ve programı; veliye yalnızca hesabına bağlı öğrenciler; öğretmene atanmış sınıf ve dersler; yöneticiye kurum özeti ve yetkili öğrenci analizleri.
- Veli sohbetinde öğrenci seçilir; öğretmen ve yönetici de yetkili öğrenci ve onaylı konuyu seçebilir. Öğrenci/konu değişimi devam eden isteği, eski geçmişi, fotoğrafı ve ses oynatımını temizler. Kişisel analiz ve veli hesap özeti seçilen öğrenciyle sınırlanır.
- Her soruda veritabanından yeniden okunan hesap yetkisi ve güncel bilgiler. Konuşmada başka bir kullanıcı kimliği yazmak erişim kapsamını değiştirmez.
- OpenAI bağlantısı etkinse PNG, JPEG veya WebP soru fotoğrafı (en fazla 4 MB).
- Destekleyen tarayıcılarda, kullanıcı açtığında Türkçe yanıt okuma ve mikrofondan yazdırma. Kullanılabilir sesler cihaz/tarayıcıya bağlıdır.
- Maskotun bekleme, düşünme, dinleme ve konuşma hareketleri; hareket azaltma tercihi ve mobil ekran desteği.
- Oturum boyunca, hesaba göre ayrılmış sohbet. Fotoğraf içerikleri kalıcı sohbet deposuna yazılmaz.
- Son soru fotoğrafı bellekte tutularak devam sorusunda yeniden iletilir. Yenilemeden sonra fotoğrafın yeniden eklenmesi gerekir. Üretilen görseller de oturum deposuna yazılmaz; saklamak için indirilmeleri gerekir.
- İstek beklerken **Durdur**; bağlantı hatasında taslağı koruma ve **Tekrar dene**. Kapatılmış sohbet penceresi yeni yanıt gelince kendiliğinden konuşmaya başlamaz.
- Panel menüleri ve destek ekranlarından derlenmiş, role uygun ürün kullanım rehberi. Sistem yönlendirmeleri sunucudaki izinli yollarla sınırlıdır.
- Sunucunun belirlediği izinli ekran bağlantıları. Veri değiştirme, ödeme, not güncelleme ve mesaj gönderme işlemleri bu sürümde sohbet tarafından yapılmaz; kullanıcı ilgili ekrana yönlendirilir.

## Render kurulumu

`atlasderslik-api` servisinin Environment bölümünde:

| Değişken | Kullanım |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI anahtarı; yalnızca API sunucusunda saklanır |
| `OPENAI_MODEL` | Varsayılan ekonomik `gpt-6-luna`; bütçe tarifesi tanımlı `gpt-6-sol` ve `gpt-6-astra` da seçilebilir |
| `OPENAI_IMAGE_MODEL` | Varsayılan `gpt-image-2.5-flare`; isteğe bağlı `gpt-image-2.5-sunburst` |
| `OPENAI_TRANSCRIPTION_MODEL` | Varsayılan `gpt-transcribe`; kayıtlı ders sesini yazıya çevirir |
| `ATLAS_OPENAI_BUDGET_USD` | İlk kullanımdan itibaren 30 gün için en fazla 50 USD. Daha düşük değer ayarlanabilir; `0` yeni çağrıları durdurur |
| `ATLAS_IMAGE_GENERATION_ENABLED` | `false` verilirse görsel üretimi kapatılır; görsel soru çözümü etkilenmez |
| `GROQ_API_KEY` | İsteğe bağlı mevcut metin sağlayıcısı |
| `HUGGINGFACE_API_KEY` | İsteğe bağlı ikinci metin sağlayıcısı |
| `TRUST_PROXY_HOPS` | Render ters vekili için `1`; doğrudan internete açılan API için `0` |

Eğitim sohbeti, kapsam sınıflandırması, görsel, PDF materyali ve ders özeti yalnızca OpenAI kullanır; OpenAI hatasında başka sağlayıcıya geçmez. `OPENAI_API_KEY` yoksa eğitim içeriği üretimi kapalıdır. Gelişim ölçümleri anahtarsız çalışır; deterministik çalışma planı için yine güncel müfredat onayı gerekir. Anahtar varlığı erişilebilirlik garantisi değildir: model yetkisi ve kota gerçek bir istekle doğrulanmalıdır. Görsel gönderildiğinde resme erişemeyen modele geçilmez. Başarısız sağlayıcı yanıtı çözüm gibi gösterilmez.

Görsel üretiminde OpenAI Responses API'ye tek bir `image_generation` aracı tanımlanır; `max_tool_calls: 1`, PNG çıktı ve orta kalite kullanılır. Bir hesap dakikada en fazla üç görsel isteği gönderebilir. Metin sohbeti ve öğrenme raporları ayrı ayrı dakikada 20 istekle sınırlıdır. İstemcide durdurma yanıtı beklemeyi keser; sağlayıcının başlamış ücretli üretimini geri alma garantisi yoktur.

Metin, müfredat denetimi, PDF, görsel ve kayıtlı ders sesi aynı MongoDB bütçesini paylaşır. Çağrıdan önce ihtiyatlı bir tutar atomik olarak ayrılır. Doğrulanmış metin kullanımında ayrılan tutar ölçüme göre güncellenir; zaman aşımı, görsel ve ses için ihtiyat payı korunur. Bütçe veya 30 gün dolunca yeni sağlayıcı çağrısı yapılmaz. Süre otomatik yenilenmez. Yönetim Paneli → **Sistem Durumu → AtlasAI Bütçesi** tahmini kullanımı ve süreyi gösterir. Bu kayıt yalnız Atlas Derslik üzerinden yapılan çağrıları kapsar; OpenAI faturasının, başka projelerin veya aynı anahtarı kullanan başka uygulamaların yerine geçmez. OpenAI projesinde ayrıca [zorunlu harcama sınırı](https://developers.openai.com/api/docs/guides/rate-limits#spend-limits) tanımlayın; harcama uyarısı tek başına çağrıları durdurmaz.

Bu uç noktalarda ortak okul Wi-Fi IP kotası yerine JWT ile belirlenen hesap kotası uygulanır; durum sorgusu da hesap kotasına dahildir. Kimlik doğrulama her istekte zorunludur.

Web servisinde `NEXT_PUBLIC_API_URL` API servisinin HTTPS adresidir. API anahtarları hiçbir zaman `NEXT_PUBLIC_` değişkenlerine konmaz. Yeni marka ikonları SVG, dört boyutlu ICO, Apple simgesi ve web manifestiyle sunulur; sabit ikon yolları yeniden doğrulanabilir önbellek başlıkları kullanır.

Yerel geliştirmede isteğe bağlı aynı site bağlantısı:

```dotenv
NEXT_PUBLIC_API_URL=/api
ATLAS_API_PROXY_URL=http://127.0.0.1:3001
```

## Veri sınırları

Aylık özetler liste sınırından bağımsız toplama sorgularıyla hesaplanır. Konu analizi son 90 gündeki en yeni 80 test ve en fazla 2.000 soru üzerinden yapılır; kapsam ve eksik veriler `evidence` alanında belirtilir. Değiştirilmiş veya silinmiş soru/testlerden doğrulanamayan konu ölçümü çıkarılmaz. Doğru cevap anahtarları hesap bağlamına veya istemciye gönderilmez.

Mevcut veri modeli tekrar çözülen testin önceki sonucunu güncellediği için sayılar **her testin son teslimine** aittir. Önceki ay karşılaştırması, elde kalan son kayıtlardan hesaplanır; bütün deneme geçmişi veya kesin öğrenme kazanımı olarak yorumlanmamalıdır. Video izleme süresi ve bağımsız çalışma süresi mevcut şemada ölçülmez.

Veli yetkisinin kaynağı `User.parentId`; öğretmen yetkisinin kaynağı `TeacherAssignment` ile `StudentEnrollment` eşleşmesidir. İstek gövdesindeki `studentId` yetki vermez, sadece erişimi zaten olan öğrenciyi seçer. Toplu görünüm en fazla sekiz öğrenciyle sınırlıdır. Büyük kurumlar için aramalı/sayfalı öğrenci seçimi sonraki geliştirmedir.

Öğretmenin öğrencisine plan hazırlarken başka derslere çakışma yazmaması için tam haftalık meşgul saatleri alınır; yetki dışı ders adları **Diğer ders (meşgul)** olarak maskelenir. Tekil canlı dersler yalnız başlangıç/bitiş aralığıyla taşınır. Test şemasında kesin sınıf kimliği bulunmadığından test erişiminde mevcut `gradeLevel + subjectId` eşleşmesi kullanılır; kesin sınıf kimliği olan içerikte sınıf–ders çifti korunur.

Model isteğinde OpenAI Responses API `store: false` kullanılır. Model sağlayıcısının kendi veri işleme kuralları ayrıca geçerlidir. Parola, erişim anahtarı, iletişim bilgileri, toplantı şifreleri ve gizli sınav cevap anahtarları hesap bağlamına eklenmez. Hesap özetleri sınırlı kayıt sayısıyla gönderilir; bütün geçmişi temsil ettikleri söylenmez.

Sohbet modeli veritabanında işlem yapmaz. Plan oluşturma ve tamamlandı işaretleri, kullanıcının ekrandaki eylemleriyle doğrulanmış API uçlarına kaydedilir. Planlar hesap sahibine özeldir; veli, öğrenci ve öğretmen birbirlerinin kaydını değiştiremez. Her erişimde güncel öğrenci yetkisi kontrol edilir. Öğretmenin ders/sınıf yetkisi daraldığında eski kapsamı içeren plan yeniden açılmaz. Yeni plan, önceki planın ve tamamlandı işaretlerinin yerini alır; eski sürüme yazma isteği 409 döner.

`atlassavedplans` koleksiyonundaki benzersiz `ownerId + studentId` indeksi API başlangıcında hazırlanır. Yayındaki veritabanı hesabının bu indeksi oluşturma yetkisi bulunmalıdır. İlerleme değişiklikleri atomiktir ve ayrı 60 istek/dakika hesap kotası kullanır.

## Doğrulama

```sh
pnpm install --frozen-lockfile
pnpm --filter @repo/shared build
pnpm --filter @repo/ui build
pnpm --filter api exec jest --runInBand
pnpm --filter api build
pnpm --filter web build
pnpm audit --prod
```

Testler rol kapsamı, gerçek JWT koruması, sohbet ve giriş denemesi sınırları, sahte geçmiş rolleri, geçersiz fotoğraflar, sağlayıcı kesintileri ve görselin metin sağlayıcısına yanlışlıkla düşmesini kapsar. GitHub iş akışı yeni değişikliklerde API testlerini ve iki üretim derlemesini çalıştırır.

Ek testler İstanbul ay sınırlarını, konu analizi ve değişmiş soru kayıtlarını, ders eşleşmesi yetkilerini, plan süre/mola sınırlarını, dolu takvimleri, aralıklı tekrarları, görsel üretim çıktısı ve ayrı kotasını kapsar. Yerel UI test sunucusu `.codex_artifacts/atlasai-qa-server.cjs` yalnızca yapay test kayıtları kullanır; üretime bağlanmaz ve dağıtıma dahil edilmemelidir.

API yüzeyi:

| Uç nokta | Davranış |
| --- | --- |
| `GET /atlas-ai/status` | Taze hesap kontrolü, yapılandırılmış sohbet/fotoğraf/görsel yetenekleri |
| `POST /atlas-ai/chat` | `message`, en fazla 12 `history` kaydı, isteğe bağlı `image`, `mode: chat veya image` |
| `GET /atlas-ai/insights?studentId=...` | Yetkili öğrenci ve takvim ayı ölçümleri |
| `POST /atlas-ai/plan` | İsteğe bağlı `studentId`, `dailyMinutes: 15–180`, `startHour: 8–20`; oluşturulan planı hesaba kaydeder |
| `GET /atlas-ai/saved-plan?studentId=...` | Hesabın seçili öğrenci için kaydettiği plan, tamamlanan adımlar ve kayıt zamanı |
| `PATCH /atlas-ai/saved-plan/progress` | `studentId`, `planId`, `blockId`, `completed`; geçerli bir çalışma adımının durumunu kaydeder |

Yayında `/health`, giriş, `/atlas-ai/status`, kısa bir gerçek soru ve marka ikonlarının HTTP yanıtı doğrulanmalıdır. `status.available` yapılandırma durumudur; bir sağlayıcı sağlık testi değildir.

14 Eylül 2026 uygulama ve kontrol sonuçları: [teslim notu](atlas-ai-implementation-report.md).

20 Eylül 2026 geliştirmeleri ve gerçek yerel kurulum: [yerel doğrulama notu](atlas-ai-local-verification.md). Dört deneme hesabıyla başlatma: [yerel kurulum rehberi](atlas-local-seed.md).


## Güncel MEB kapsamı ve PDF materyalleri — 8 Ekim 2026

Her eğitim isteği, öğrencinin güncel sınıf ve ders kaydı ile **yönetici tarafından onaylanmış** kaynak/kazanım snapshot'ına bağlanır. Öğrencinin aktif sınıf kayıtları tek bir geçerli sınıf seviyesinde olmalıdır; profil sınıfı bunlarla çelişirse üretim engellenir. Aynı seviyedeki farklı şubeler kabul edilir; pasif sınıflar güncel kapsamı genişletmez. Veli yalnız bağlı öğrenciyi, öğretmen yalnız atanmış sınıf–ders çiftini seçebilir. İstek ve üretilen içerik ayrı kapsam denetimlerinden geçer; listede olmayan kazanım kimliği, eski yıl, onayı kaldırılmış içerik, talimat enjeksiyonu veya doğrulanamayan yanıt reddedilir. Üretim sırasında yetki/onay yeniden kontrol edilir. Eğitim içeriği sadece OpenAI üzerinden üretilir. Bu kural eski soru üretici, çalışma koçu, günlük soru ve plan akışlarında da uygulanır. Sınırlı ürün gezinme yardımı, eğitim içeriği üretmeden ayrı denetlenir.

Admin **Konular → Müfredat onayı** ekranında gerçek sınıfı, eğitim yılını, program türünü, resmî MEB kaynak adresini, sürümü, sayfa/bölüm referansını ve yayımlanmış kazanım kodları/metinlerini girer. Taslak kaydedilir; kaynağı inceleyen admin ayrı onay işlemini tamamlar. Öğretmen kendi dersinde taslak sunabilir. Taslağın değiştirilmesi veya onayın kaldırılması eski PDF, özet, günlük soru ve planların erişimini geçersiz kılar. Eski seed konu başlıkları kendiliğinden MEB onaylı olarak kabul edilmez.

2026–2027 için temel eğitimde genel uygulama 1, 2, 3, 5, 6, 7. sınıflarda TYMM; 4 ve 8. sınıflarda önceki programdır. Ortaöğretimde genel uygulama 9, 10, 11. sınıflarda TYMM; 12. sınıfta önceki programdır. Dersin kendi uygulama takvimi ayrıca kontrol edilir: **normal İngilizce dersinde 7. sınıf, 8. sınıf gibi önceki programı kullanır**; 5 ve 6. sınıflar TYMM kullanır. [MEB 2026–2027 İngilizce yıllık planındaki](https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-yillik-planlar_20260902_114918_045.zip) 7–8. sınıf sayfaları 19.01.2018/15, 5–6. sınıf sayfaları 24.07.2025/45 kararına dayanır. Backend bu ders istisnasını taslakta, onayda ve öğrenci kapsamı oluştururken uygular; inceleme uç noktası canlı konu–ünite–ders bağlantısından `subjectName`, `gradeLevel` ve `expectedProgram` döndürür. Sonraki eğitim yılı resmî kaynaklarla doğrulanana kadar eğitim kapsamı ve yeni onaylar kapalı kalır.

Program adı aynı kalsa da belge sürümü değişebilir. [MEB yıllık planları](https://tymm.meb.gov.tr/taslak-cerceve-planlari/temel-egitim) matematik 5–7 için 07.08.2026/70, Türkçe 5 için 07.08.2026/97, Türkçe 6–7 için 23.05.2024/20 kararlarını esas alır. Tek bir 2024 veya 2026 belgesi bütün sınıflara kopyalanmaz. Genel uygulama kaynakları: [TEGM duyurusu](https://tegm.meb.gov.tr/www/2026-2027-egitim-ogretim-yili-taslak-cerceve-planlar-yayinlandi/icerik/1316), [MEB ortaöğretim duyurusu](https://ogm.meb.gov.tr/www/2026-2027-egitim-ogretim-yili-turkiye-yuzyili-maarif-modeli-taslak-cerceve-planlar-yayimlandi/icerik/2633/tr), [güncel ve önceki program belgeleri](https://mufredat.meb.gov.tr/programlar.aspx).

**2026–2027 müfredatını kullanıma açma:**

1. [MEB Temel Eğitim Genel Müdürlüğü duyurusundan](https://tegm.meb.gov.tr/www/2026-2027-egitim-ogretim-yili-taslak-cerceve-planlar-yayinlandi/icerik/1316/tr) uygulama yılını ve sınıfı doğrulayın; [dersin yıllık planındaki](https://tymm.meb.gov.tr/taslak-cerceve-planlari/temel-egitim) karar tarihini ilgili program belgesiyle eşleştirin. Normal İngilizce 7. sınıf istisnasını dikkate alın; programın yayımlanmış olması o yıl bütün sınıflarda uygulandığı anlamına gelmez.
2. **Konular → Müfredat onayı** ekranında gerçek sınıf, ders ve konu kaydını seçin. İlgili resmî program belgesinin bağlantısını, sürümünü ve sayfa veya bölümünü kaydedin; yalnız o bölümde doğrulanan kazanım kodlarını ve metinlerini girin. Taslak yıllık plan, program belgesindeki kazanımın yerine geçmez.
3. Yönetici aynı belgeyi açarak sınıf, ders, bölüm ve kazanım eşleşmesini kontrol eder, inceleme notunu yazar ve taslağı onaylar. Doğrulanamayan konu taslak kalır; onaylı bir konu ve kapsam dışı bir istekle öğrenci erişimini sınayın.

**PDF materyaller** alanında onaylı konu ve konu anlatımı/çalışma kâğıdı türü seçilir. İçerik, gerçek kazanım kimlikleriyle yapılandırılmış OpenAI yanıtından oluşturulur ve kaydedilmeden yeniden doğrulanır. A4 şablonu `atlas-a4-v1`; Atlas logosu, hafif logo filigranı, gömülü Türkçe yazı tipleri, sınıf/program/kaynak bilgisi, soru çözüm alanları, ayrı cevap sayfası ve sayfa numarası içerir. Logo ve yazı tipleri API paketine dahildir; harici görsel veya HTML yüklenmez. Hesap başına dakikada en fazla iki materyal ve aynı anda bir üretim yapılabilir. Belgeler yalnız sahibine aittir; indirmeden önce güncel yetki ve onay kontrol edilir.

Denetimler kapsam dışı üretimi durdurmak için tasarlanmıştır; model sınıflandırması kesin anlamsal doğruluk garantisi değildir. Yönetici/öğretmen kaynak kontrolü ve materyal incelemesi gereklidir. Müfredat kaynak metinleri manuel olarak doğrulanıp eşleştirilir; uygulama bütün MEB PDF'lerini otomatik taradığını iddia etmez. Tek isteğin geniş kapsamı en fazla 200 onaylı konudur; büyük kurum görünümünde öğrenci/konu seçerek kapsam daraltılmalıdır. Yetki dışındaki dersler öğretmenin bu sınırını tüketmez.

## Ders kaydı analizi

Öğretmen video kütüphanesine MP4/WebM dosyası yükler; öğrenci veya öğretmen kayıt açıldıktan sonra özet talep eder. Tam ses, 10 dakikalık parçalarda OpenAI ile yazıya çevrilir; süreye yayılan en fazla 12 görüntü karesi tahta/sunum içeriği için incelenir. Özet kaynak ve müfredat denetiminden geçer; ses/karelerden desteklenmeyen içerik paylaşılmaz. Kuyruk, günlük kota ve özet sürümleri MongoDB'de saklanır. Yaklaşık zaman bağlantıları ve analiz kapsamı kullanıcıya gösterilir. Ayrıntılar: [ders videosu kurulum ve sınırlar](lesson-video.md).

Yeni API yüzeyi: `/atlas-ai/curriculum/scope`, `/atlas-ai/curriculum/review`, `/atlas-ai/curriculum/draft`, `/atlas-ai/curriculum/:id/approve|revoke`; `/atlas-materials` ve `/atlas-materials/:id/pdf`; `/lesson-videos/status`, `/lesson-videos/upload`, `/lesson-videos/:id/playback`, `/lesson-videos/:id/summary`.

## OpenAI ve canlı iyzico bağlantısını tamamlama

Canlı OpenAI anahtarı yalnız API servisinin gizli Environment alanındaki `OPENAI_API_KEY` değerine yazılır. Sohbete veya başka bir açık konuma yazılmış anahtar [iptal edilip yenilenmelidir](https://developers.openai.com/api/docs/guides/safety-best-practices#revoke-compromised-api-keys). `npm run local` üretim anahtarlarını kullanmaz; gerçek yerel deneme gerekiyorsa ayrı bir OpenAI test projesinin anahtarı `ATLAS_LOCAL_OPENAI_KEY` olarak süreç ortamından verilir. Bu yerel deneme ayrı veritabanında 2 USD ile sınırlıdır. `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL` ve `OPENAI_TRANSCRIPTION_MODEL` erişimleri ilgili OpenAI projesinde doğrulanır. Geçerli anahtar eklendikten sonra kısa örnek soru, PDF ve kayıtla uçtan uca kontrol edilir.

Canlı iyzico hesabına ait `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL=https://api.iyzipay.com`, herkese açık HTTPS API adresiyle `PAYMENT_CALLBACK_URL=https://API_ALAN_ADI/payment/provider-callback` ve HTTPS `FRONTEND_URL` ayarlanır. Sandbox anahtarı canlı uçla kullanılmaz. Admin **Siparişler** ekranı konfigürasyon hazırlığı ile gerçekten doğrulanmış canlı ödeme kaydını ayrı gösterir. Sunucu callback'i sağlayıcı imzasını, sipariş/tutar/para birimini ve fraud kararını doğrular; idempotent şekilde paket ve yalnızca açıkça eşleştirilmiş sınıf haklarını verir. Paket sınıf seviyesinin öğrencinin yetkili seviyesine uyması gerekir. Gerçek fatura bilgileri ve iyzico'nun barındırdığı kart sayfası kullanılır; uygulama kart bilgisi saklamaz. Sahte yerel paket satın alma yolu kapatılmıştır.

`npm run local` üretim ödemesini kasıtlı olarak kapalı tutar. Yerel öğrenci hesabı gerçek tahsilat başlatamaz. `render.yaml` video dosyaları için kalıcı disk ve sunucu ortam değişkenlerini tanımlar; bu dosyanın değiştirilmesi kendiliğinden dağıtım veya canlı aktivasyon yapmaz. Disk bütçesi `ATLAS_VIDEO_STORAGE_MAX_GB` ile ayrılan diskten daha düşük tutulmalıdır; varsayılan 10 GB disk için 8 GB ayarlanmıştır. Sunucu tek kopya dosya adaptörü kullanır; ölçeklenirken ortak depolama gerekir.

## Sonraki ürün adımları

Resmî kazanımların bütün dersler için doğrulanarak doldurulması ve kaynaklı içerik havuzu; düzenli Türkçe soru çözüm değerlendirmeleri; test denemelerinin değişmez geçmişi; video/çalışma etkinlik ölçümü; doğal OpenAI gerçek zamanlı ses ve ağız senkronu; cihazlar arasında kalıcı öğrenme hedefleri sonraki ürün adımlarıdır. Mevcut ses tarayıcı sesidir, maskot hareketleri CSS animasyonudur. Bu sürüm gerçek zamanlı konuşma veya fotogerçekçi ağız senkronu sunduğu iddiasında bulunmaz.

## Resmî kaynaklar

- [OpenAI GPT-6 Luna model belgesi](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI metin üretimi ve Responses API](https://developers.openai.com/api/docs/guides/text)
- [OpenAI görsel girdi rehberi](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI görsel üretimi](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI Responses API başvuru belgesi](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [Next.js API yönlendirmeleri](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)

## Son yerel doğrulama — 8 Ekim 2026

- Güncellenmiş bağımlılıklarla **20 API test takımı / 299 test** başarılı. Paylaşılan paketlerin, API'nin ve Next.js web uygulamasının üretim derlemesi başarılı; web 61 sayfa oluşturdu. Değiştirilen bütün web TypeScript/TSX dosyalarının ESLint kontrolü temiz. API, `npm run local` başlatılırken yeniden derlendi.
- Next.js ve eslint-config-next `16.3.8`; Multer `2.4.0`, ip-address `10.7.1`, proxy-addr `2.0.8`, source-map-js `1.2.2`, sharp `0.35.5` düzeltmeleri kilit dosyasına işlendi. Yalnız Postman Request bağımlılığı için UUID `11.1.1` kullanılır. Gerçek yüklenen UUID ve iyzipay constructor/checkout metodları ile sharp'ın Atlas logosunu okuyabilmesi kontrol edildi. `pnpm audit --prod` bütün önem düzeylerinde **0 açık** bildirdi; bu sonuç taramanın o tarihteki npm kayıtlarına aittir.
- Öğrenci/konu değişimi, hesap değişimi, çok çocuklu veli, geç gelen yanıt, fotoğraf/geçmiş/ses ayrımı ve tek çocuk seçimi için geçici React 19 düzeneğinde 8 durum kontrolü geçti. Bu kontrol tarayıcıda görsel inceleme yerine geçmez.
- Gerçek 3 saniyelik yerel MP4 üzerinde FFprobe, ses ve kare çıkarımı başarılı. Logolu ve filigranlı örnek PDF'nin üç sayfası görüntüye çevrilip incelendi. Örnek belge yalnız tasarım önizlemesidir; MEB onaylı içerik değildir.
- Yerel servisler tekrar açıldı: giriş sayfası HTTP 200, MongoDB `connected`, süreç durumu `ready`. Öğrenci, veli, öğretmen ve admin gerçek API girişleri ve yetkili gelişim özetleri başarılı. Parolalar ve mevcut yerel veriler korundu.
- Yerel seed'de **0 onaylı MEB konusu** vardır. Materyal listesi boş döner; OpenAI anahtarsız PDF üretimi 503, müfredat onaysız plan 400, başka öğrenci seçimi 403 döndürür. Gerçek MP4 ile öğretmen yüklemesi onaylı konu olmadığı için 403 döndürdü ve geçici dosya temizlendi. Dosya işleme hazırlığı açık, AI özeti anahtar olmadığı için kapalıdır.
- Özel uç noktalar oturumsuz 401; öğrenci hesabından ödeme admin ekranı 403 döndürür. Ödeme indeksleri hazırdır; yerel ödeme `unconfigured`, tahsilat ve gerçek canlı ödeme doğrulaması kapalıdır. Yapılandırılmamış ödeme dönüşü yönlendirme yapmadan 503 verir; yapılandırılmış sağlayıcı dönüşünün 303 davranışı API testleriyle doğrulanmıştır.
- Tarayıcının mevcut dahili hata sayfasına erişim güvenlik politikası tarafından engellendiği için yeni ekranların tarayıcıdaki görsel kontrolü tamamlanamadı. Doğrudan HTTP kontrolleri, React kapsam kontrolleri ve PDF sayfa incelemesi gerçekleştirildi. Gerçek OpenAI/POS uçtan uca denemesi ve canlı dağıtım yapılmadı.

Güvenlik güncellemelerinin kaynakları: [Next.js 16.3.8 sürümü](https://github.com/vercel/next.js/releases/tag/v16.3.8), [Multer dosya yükleme düzeltmesi](https://github.com/expressjs/multer/security/advisories/GHSA-3pph-fpjx-jg34), [UUID CommonJS paket tanımı](https://github.com/uuidjs/uuid/blob/v11.1.1/package.json). Canlı bağlantı ve MEB onayı adımları yukarıdaki kurulum bölümlerindedir.
