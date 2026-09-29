# AtlasAI

AtlasAI; öğrenci, öğretmen, veli ve yönetici panellerinde çalışan, Atlas maskotuyla sunulan eğitim asistanıdır. Her panelin menüsündeki **AtlasAI** sayfasından veya sağ alttaki maskottan açılır.

## Öğrenme çalışma alanı

AtlasAI artık **Sohbet**, **Gelişimim / Öğrenci gelişimi** ve **Çalışma planım / Çalışma planı** alanlarını içerir. Panellerdeki mevcut Atlas karakteri kullanılır. Köşe maskotu oturum başına bir kez karşılar; bekleme, düşünme, dinleme ve konuşma hareketleri gösterir.

- **Bu ay ne yaptım?** İstanbul takvim ayına göre tamamlanan test, teslim edilen ödev, ortalama puan ve önceki aya göre puan farkı veritabanında hesaplanır. Eksik puan sıfır diye gösterilmez.
- **Nerede eksiğim var?** Öğrencinin işaretlediği yanıtlar soruların ders/konu eşleşmeleriyle değerlendirilir. Doğru, yanlış, boş, doğruluk oranı ve ölçümün güveni gösterilir. Az sayıda sorudan kesin bir konu eksiği iddiası üretilmez.
- **Bana plan çıkar.** Günlük süre ve başlangıç saatinden yedi günlük, molalı bir program çıkar. Öncelikli konular, yaklaşan ödevler ve 1/3/6 gün aralıklı tekrarlar kullanılır. Haftalık program ve tekil canlı ders randevularıyla çakışma önlenir; geçmiş saatlere veya 21.30 sonrasına çalışma yazılmaz. Uygun süre yoksa plan kısalır ve gerekçesi görünür.
- **Çalışmayı takip et.** Plan ve tamamlanan adımlar MongoDB'de hesap/öğrenci bazında saklanır; yeniden girişte geri yüklenir. “Bugünün odağı” sıradaki çalışmayı ve işaretlenen süreyi gösterir. Kayıt hatasında işaret geri alınır ve yeniden deneme sunulur. `.ics` indirmesi Türkiye saat diliminde kişisel takvime aktarılabilir.
- **Görsel oluştur.** Sohbet oluşturucusundaki ayrı moddan fen şeması, kavram haritası veya öğrenme illüstrasyonu istenir. Gerçek OpenAI görsel aracı çağrılır; dönen PNG görüntülenir ve indirilebilir.

Gelişim ölçümleri ve program oluşturma bir modelin sayı tahminine bağlı değildir; **AI anahtarı olmasa da** yetkili veritabanı kayıtlarıyla çalışır. Model bu ölçümleri sohbet içinde açıklar ve soru çözer. Model çıktıları not, ödeme, kayıt veya öğretmen programını değiştirmez.

## Sohbet ve erişim

- Çok turlu Türkçe sohbet, adım adım soru çözümü ve çalışma planı önerileri.
- Öğrenciye kendi ödevleri, sonuçları ve programı; veliye yalnızca hesabına bağlı öğrenciler; öğretmene atanmış sınıf ve dersler; yöneticiye kurum özeti ve yetkili öğrenci analizleri.
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
| `OPENAI_MODEL` | Varsayılan `gpt-6-astra`; hesaptaki model erişimine uygun değiştirilebilir |
| `OPENAI_IMAGE_MODEL` | Varsayılan `gpt-image-2.5-sunburst`; eğitim görseli aracı |
| `ATLAS_IMAGE_GENERATION_ENABLED` | `false` verilirse görsel üretimi kapatılır; görsel soru çözümü etkilenmez |
| `GROQ_API_KEY` | İsteğe bağlı mevcut metin sağlayıcısı |
| `HUGGINGFACE_API_KEY` | İsteğe bağlı ikinci metin sağlayıcısı |
| `TRUST_PROXY_HOPS` | Render ters vekili için `1`; doğrudan internete açılan API için `0` |

`OPENAI_API_KEY` yoksa mevcut Groq/Hugging Face metin sohbeti çalışmaya devam eder; fotoğraf düğmesi kapalı kalır. Anahtar varlığı erişilebilirlik garantisi değildir: model yetkisi ve kota gerçek bir istekle doğrulanmalıdır. Görsel gönderildiğinde resme erişemeyen modele geçilmez. Başarısız sağlayıcı yanıtı çözüm gibi gösterilmez.

Görsel üretiminde OpenAI Responses API'ye tek bir `image_generation` aracı tanımlanır; `max_tool_calls: 1`, PNG çıktı ve orta kalite kullanılır. Bir hesap dakikada en fazla üç görsel isteği gönderebilir. Metin sohbeti ve öğrenme raporları ayrı ayrı dakikada 20 istekle sınırlıdır. İstemcide durdurma yanıtı beklemeyi keser; sağlayıcının başlamış ücretli üretimini geri alma garantisi yoktur. Çok sunuculu yayında ortak kota deposu ve kurum bütçesi limiti ayrıca kurulmalıdır.

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

## Sonraki ürün adımları

Öğretmenlerin denetlediği MEB kazanım haritası ve kaynaklı içerik havuzu; düzenli Türkçe soru çözüm değerlendirmeleri; test denemelerinin değişmez geçmişi; video/çalışma etkinlik ölçümü; doğal OpenAI gerçek zamanlı ses ve ağız senkronu; cihazlar arasında kalıcı öğrenme hedefleri sonraki ürün adımlarıdır. Mevcut ses tarayıcı sesidir, maskot hareketleri CSS animasyonudur. Bu sürüm gerçek zamanlı konuşma veya fotogerçekçi ağız senkronu sunduğu iddiasında bulunmaz.

## Resmî kaynaklar

- [OpenAI GPT-6 Astra model belgesi](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [OpenAI metin üretimi ve Responses API](https://developers.openai.com/api/docs/guides/text)
- [OpenAI görsel girdi rehberi](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI görsel üretimi](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI Responses API başvuru belgesi](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [Next.js API yönlendirmeleri](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
