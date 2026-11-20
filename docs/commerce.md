# Paket, sipariş ve ödeme rehberi

30 Ekim 2026 itibarıyla depoda uygulanan davranışlar. Üyelik, hesaba ait sepet ve iyzico'nun barındırdığı ödeme sayfasına geçiş tek çekim satın alma akışını oluşturur. Ödeme onayı, öğrencinin sınıfa kaydedilmesi ve paket süresinin geçerliliği ayrı kontrol edilir. Bu belge üretime dağıtım, iyzico başvuru onayı, gerçek sağlayıcı testi veya banka tahsilatı kanıtı değildir. Ortamın yapılandırılmış olması da gerçek tahsilatın veya bankadan iadenin gerçekleştiğini kanıtlamaz.

## Ekranlar

| Ekran | Kullanım |
| --- | --- |
| `/packages` ve ana sayfadaki paketler | Satışa uygun paketleri inceleme, gerçek paket detayına veya sepete geçiş. |
| `/packages/:id` | Güncel açıklama, özellikler, gerçek sınıf kapsamı, fiyat, erişim süresi ve satıcı bilgisi. Pasif veya bulunamayan paket 404 döner. |
| `/cart?packageId=…&studentId=…` | Giriş kontrolü, veli için bağlı öğrenci seçimi/oluşturma, sunucudaki sepet, güncel toplam ve uygunluk, alıcı bilgileri, üç ayrı onay ve iyzico'ya geçiş. |
| `/payment?packageId=…` | Eski web adresi; seçilen paket/öğrenci korunarak yeni sepet akışına yönlendirilir. |
| `/register`, `/login` | Öğrenci/veli üyeliği ve güvenli yerel dönüş adresini koruyan giriş. |
| `/account/security`, `/sifremi-unuttum` | Mevcut şifreyle hesap şifresi değiştirme; şifresini hatırlamayan kullanıcıya gerçek destek kanalları. E-posta sıfırlama bağlantısı gönderilmez. |
| `/payment/result?orderId=…` | Satın alma hesabının erişebildiği siparişin sunucudan doğrulanması. URL'deki bir başarı parametresi ödeme onayı sayılmaz. |
| `/student/packages` | Aktif paket erişimi ve sayfalı sipariş geçmişi. |
| `/parent/packages` | Bağlı öğrenciye göre aktif paket ve aile hesabının erişebildiği siparişler. |
| `/admin/packages` | Paket taslağı, düzenleme, fiyat/dönem/sınıf doğrulaması ve satışa kapatma. |
| `/admin/orders` | Sanal POS hazırlığı, arama, durum/ortam/tarih filtreleri, sayfalama, sunucu toplamları, sipariş detayı ve yeniden doğrulama. |

Paket seçimi giriş/kayıt sırasında güvenli `/cart?packageId=…` dönüş adresiyle korunur. Yönlendirme yalnız bilinen yerel rotaları, geçerli nesne kimliklerini ve role uygun alanları kabul eder; dış adresler, giriş döngüleri ve istemcinin fiyat gibi ek parametreleri ayıklanır. Öğrenci kendi hesabı için; veli yalnızca kendisine bağlı aktif öğrenci için satın alabilir. Yönetici ve öğretmen hesabı öğrenci adına ödeme başlatmaz. Hesap veya veli öğrenci seçimi değiştiğinde eski isteğin yanıtı yeni hesap adına ödeme yönlendirmesi yapmaz.

## Üyelik ve oturum

Herkese açık `POST /auth/register` yalnız `STUDENT` ve `PARENT` rollerini kabul eder. Öğrenci sınıfı tam sayı olarak **1–8** aralığındadır; veli kaydına öğrenci sınıfı eklenmez. Kullanım koşullarının kabulü ve gizlilik bildiriminin okunduğu bilgisi zorunludur; sürümler ve kabul zamanı saklanır. Öğretmen/yönetici hesabı herkese açık kayıt formundan oluşturulamaz. E-posta normalize edilir; bilinmeyen alanlar, rol yükseltme alanları ve hatalı kimlik/şifre girdileri reddedilir.

Aktif veli, `POST /auth/students` ile 1–8. sınıfta bir öğrenci hesabı oluşturabilir. `guardianConsent: true` gerekir; öğrenci veliye sunucuda bağlanır ve veli/onay bilgisi kaydedilir. Bu işlem başka bir mevcut öğrenciye kendiliğinden sahiplik vermez. Ücretsiz üyelik sınıf veya ücretli paket erişimi oluşturmaz.

`POST /auth/change-password`, mevcut şifreyi doğruladıktan sonra yeni şifreyi kaydeder, `sessionVersion` artırır ve çağıran kullanıcı için yeni oturum döndürür. Önceki tokenlar geçersizleşir. Her korumalı istekte hesabın aktifliği, güncel rolü ve oturum sürümü veritabanından kontrol edilir. Şifre hash'i ve diğer özel hesap alanları üyelik/giriş yanıtında yayınlanmaz. E-posta doğrulama ve e-posta bağlantısıyla şifre sıfırlama uygulanmamıştır.

## Güvenli ortam kurulumu

API ayarlarını `apps/api/.env` veya barındırma hizmetinin gizli ortam değişkenlerinde tutun. Gerçek anahtarları, özel müşteri bilgilerini ve banka hesap bilgilerini kaynak koduna, bu belgeye veya `NEXT_PUBLIC_` değişkenlerine koymayın. Kurulum alanlarının boş örneği [API ortam şablonunda](../apps/api/.env.example) bulunur.

| Değişken | Kullanım |
| --- | --- |
| `MONGO_URI` | Uygulamanın MongoDB bağlantısı. Ödeme ve sınıf kaydı tekillik indeksleri kurulabilmelidir. |
| `JWT_SECRET` | API oturumları için güçlü ve özel imza anahtarı. |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` | İlgili iyzico ortamına ait sunucu anahtarları. Tarayıcıya gönderilmez. |
| `IYZICO_BASE_URL` | Sandbox için `https://sandbox-api.iyzipay.com`; canlı için `https://api.iyzipay.com`. |
| `PAYMENT_CALLBACK_URL` | Dışarıdan erişilebilen HTTPS API adresi ve tam `/payment/provider-callback` yolu. Örnek biçim: `https://api.example.com/payment/provider-callback`. |
| `FRONTEND_URL` | Ödeme sonucuna dönülecek sitenin kök adresi. Canlıda HTTPS gerekir. Sandbox'ta yerel HTTP frontend kabul edilebilir; sağlayıcı callback adresi yine herkese erişilebilir HTTPS olmalıdır. |
| `CORS_ORIGIN` | Gerçek web adresleriyle sınırlandırılmış izinli origin listesi. |
| `TRUST_PROXY_HOPS` | Gerçek ters proxy düzenine göre ayarlanır; alıcı IP'sinin doğru alınması için önemlidir. |
| `PAYMENT_TERMS_VERSION` | Checkout kullanım koşulları sürümü; varsayılan `terms-v2026-10-30`. |
| `MEMBERSHIP_TERMS_VERSION` | Üyelikte kabul edilen kullanım koşulları; varsayılan `terms-v2026-10-30`. |
| `PRIVACY_POLICY_VERSION` | Üyelik/checkout gizlilik bildirimi; varsayılan `privacy-v2026-10-30`. |
| `SALES_AGREEMENT_VERSION` | Checkout satış sözleşmesi; varsayılan `sales-v2026-10-30`. |
| `PRE_INFORMATION_VERSION` | Checkout ön bilgilendirme; varsayılan `preinfo-v2026-10-30`. |
| `NEXT_PUBLIC_API_URL` | Yalnız web uygulamasında kullanılan API adresi; gizli anahtar içermez. |
| `ATLAS_API_PROXY_URL` | Web sunucusunda isteğe bağlı mutlak API kökü; aynı origin `/api` köprüsü ve sunucudan katalog okuması için. Gizli anahtar içermez. |

Callback adresi localhost/IP adresi, sorgu dizisi veya URL parçası içeremez. `FRONTEND_URL` kök adres olmalıdır. Sandbox anahtarları canlı ortam adresiyle kullanılmaz. Anahtar/ortam uyumu, callback, frontend, veritabanı indeksleri veya satıcı bilgileri eksikse yeni ödeme başlatma kapalı kalır.

API açılışında bekleyen sipariş, checkout tokenı, ödeme ortamı/sağlayıcı işlem kimliği ve öğrenci/sınıf kayıtları için gereken tekillik indeksleri hazırlanır. Sepet için kullanıcı başına tek kayıt indeksi de zorunludur; kurulamazsa sepet işlemleri kapalı kalır. Eski yinelenen veriler nedeniyle indeks kurulamazsa hazırlık kontrolü bunu başarısız gösterir; indeks kontrolünü devre dışı bırakmak yerine kayıtlar incelenmelidir.

`GET /payment/status` herkese açık ödeme hazırlığını; `/payment/admin/readiness` yöneticiye alan bazında kontrol sonuçlarını gösterir. `canAcceptPayments`, yapılandırmanın hazır olduğunu belirtir. Gerçek işlem kanıtı ayrıca sağlayıcı tarafından doğrulanmış sipariş kaydı gerektirir.

### Satıcı alanları

Aşağıdaki değerler gerçek işletmenin kayıtları ve iyzico hesabıyla tutarlı olmalıdır. Bu belgede kişisel veya gerçek işletme değerleri bulunmaz.

| Alan | İçerik |
| --- | --- |
| `MERCHANT_TITLE` | Resmî unvan. |
| `MERCHANT_TAX_NUMBER` | 10 veya 11 haneli vergi/kimlik numarası. |
| `MERCHANT_TAX_OFFICE` | Vergi dairesi. |
| `MERCHANT_ADDRESS` | Tam işletme adresi. |
| `MERCHANT_EMAIL` | İşletmenin geçerli iletişim e-postası. |
| `MERCHANT_PHONE` | `+90` biçiminde işletme telefonu. |

Alanların tamamı doğrulanmadan `merchant.complete` doğru olmaz ve ödeme hazırlığı tamamlanmaz. Eksik vergi dairesi veya adres uydurulmaz. `GET /payment/merchant`, yalnızca kamuya açık satıcı kimliğini döndürür; API anahtarı, müşteri verisi veya banka hesabı içermez.

Checkout ekranı güncel satıcı bilgisini gösterir. Sipariş oluşturulurken `sellerSnapshot` alınır; sipariş detayında o tarihteki satıcı bilgisi kullanılır. Eski siparişte snapshot yoksa güncel bilgi olduğu açıkça belirtilir. Sipariş detay ekranı mali fatura değildir; **e-Fatura/e-Arşiv entegrasyonu uygulanmamıştır**.

## Kamuya açık satış ve yasal bilgiler

`/hakkimizda` ve `/iletisim` gerçek işletmenin `/payment/merchant` kaydını gösterir; e-posta/telefon bağlantıları çalışan destek kanallarıdır. Ödeme kartı, banka hesabı veya IBAN bu kamu yanıtına eklenmez. Katalog yönetici tarafından girilmiş gerçek aktif paketlerden oluşur; sahte içerik, ücretsiz ilk ders, taksit, sertifika veya sağlayıcı onayı vaatleri eklenmez.

| Sayfa | Yayın sürümü |
| --- | --- |
| `/kullanim-sartlari` | `terms-v2026-10-30` |
| `/gizlilik-politikasi` | `privacy-v2026-10-30` |
| `/mesafeli-satis-sozlesmesi` | `sales-v2026-10-30` |
| `/on-bilgilendirme` | `preinfo-v2026-10-30` |
| `/iptal-iade` | `refund-v2026-10-30` |
| `/kvkk` | `kvkk-v2026-10-30` |

Web sayfalarının yol/sürüm sabitleri `apps/web/src/lib/legal-documents.ts` içindedir. API ortamında sürüm adı override edilirse yayımlanan metin ve web sabitleri aynı sürümle birlikte güncellenmelidir. Sipariş; kabul edilen kullanım, gizlilik, satış ve ön bilgilendirme sürümlerini, ilgili onay zamanlarını ve işlem bağlamını kaydeder. Ön bilgilendirme ile satış sözleşmesi aynı açık satış onayında kapsanır. Gizlilik bildiriminin okunduğu kaydı pazarlama veya her türlü veri işleme için genel açık rıza değildir.

Metinler dijital teslimatı, kargo olmadığını, paket dönemini, otomatik yenileme olmadığını ve gerçek başvuru kanallarını açıklar. Genel şart kabulü bütün cayma haklarını otomatik kaldırmış sayılmaz. Gizlilik/KVKK metinleri AI'a gönderilen soru/görsel/ses ve örnek video karelerini, hizmet sağlayıcılarını ve olası yurt dışı işlemeyi açıklar; doğrulanmamış bir sertifika, aktarım güvencesi veya tüm verilerin Türkiye'de kaldığı iddiası içermez. Yasal metinlerin bulunması, işletmenin fiilî veri aktarım mekanizmasının veya iyzico başvurusunun onaylandığını kanıtlamaz.

## Paket ve erişim kuralları

Yeni paket varsayılan olarak satışa kapalı taslaktır. Satışa açılacak pakette en az bir gerçek ve aktif `gradeIds` kaydı bulunmalı; ticaret kapsamında yalnız ilkokul/ortaokul **1–8. sınıf** kullanılmalıdır. Önceden kalmış 9–12. sınıf paketleri taslak olarak saklanabilir; satışa açılamaz. Bu ticaret sınırı bağımsız kurum/manual kayıtlarını 1–8 aralığına daraltmaz. Öğrencinin sınıfı, mevcut kayıtları ve paketin sınıfları ödeme başlatılırken sunucuda ayrıca kontrol edilir.

`gradePolicy` sınıfların öğrenciye nasıl çözümleneceğini belirler:

| Değer | Kural |
| --- | --- |
| `fixed` (varsayılan) | Pakete eklenen bütün şubeler aynı seviyede olmalıdır; uygun öğrenciye bu sınıf kümesi atanır. |
| `student-level` | Yönetici, desteklenen her seviye için en fazla bir aktif sınıfı açıkça seçer. Farklı seviyeler aynı pakette listelenebilir; ödeme yalnız öğrencinin tek güncel seviyesine uyan bir sınıfı çözümler. Eksik veya aynı seviyede birden çok eşleşme reddedilir. |

Öğrencinin profil sınıfı ile mevcut geçerli/aktif sınıf kayıtları aynı tek seviyeyi göstermelidir. Birbiriyle çelişen seviyeler, geçersiz seviye veya belirlenemeyen öğrenci seviyesi satın almayı kapatır. Henüz sınıf kaydı olmayan, geçerli profil seviyesi olan öğrenci uygun paket için değerlendirilebilir. `student-level` 1–8 seviyelerini otomatik oluşturmaz veya hepsine erişim vermez; yalnız yönetici tarafından seçilmiş sınıfları kullanır. Sipariş `packageGradePolicy` ile yöntemi ve yalnız öğrenci için çözülmüş `gradeIds` kümesini saklar; sonraki paket değişikliği satın alınan kapsamı genişletmez.

Fiyat pozitif, en fazla iki ondalık haneli ve en fazla 9.999.999,99 TL olabilir. Karşılaştırma fiyatı 0 veya satış fiyatından yüksek olmalıdır. Dönem `monthly`, `yearly` veya `one-time` değeridir. Özellik, sıralama ve metin sınırları hem yönetici formunda hem API'de doğrulanır; bilinmeyen alanlar ve veri tabanı operatörleri kabul edilmez.

Eski `gradeIds: []` paketler satış kataloğunda yayınlanmaz ve ödeme ile otomatik sınıf bulma yöntemi kullanılmaz. Yönetici önce gerçek sınıf kapsamını belirlemelidir. Public paket listesi taslak/pasif kayıtları içermez; yönetici tüm kayıtlar için `/packages/admin` kullanır.

Sınıf kapsamı boş paketler için doğrudan ödeme API'sine yapılan istekler de reddedilir. Önceden tahsil edilmiş bir siparişte sınıf kapsamı eksikse ödeme kaydı korunur; sınıf ataması tamamlanmış sayılmaz ve kurum incelemesi gerekir.

Paket düzenleme, önceden oluşturulmuş siparişin fiyat, ad, dönem, sınıf ve satıcı snapshot'larını değiştirmez. Paketi satışa kapatma fiziksel silme değildir; geçmiş siparişler ve mevcut öğrenci hakları korunur. Geçersiz eski paketler de satışa kapatılabilir.

Başarılı canlı ödeme sınıf kaydına siparişe bağlı bir erişim hakkı ekler. Aylık/yıllık sürenin başlangıcı doğrulanmış ödeme tarihidir; ay sonları takvim sınırına göre ele alınır. `one-time` pakette mevcut uygulama bir bitiş tarihi üretmez. Ödeme veya tekrar doğrulama, aynı siparişin başlangıç/bitiş tarihini ileri taşımaz.

Aynı öğrenci için aynı paketin doğrulanmış canlı tahsilatı aktif dönemindeyse yeni checkout `409` ile reddedilir. Sınıf ataması `PENDING`, `PROCESSING` veya `FAILED` olsa da ikinci tahsilat başlatılmaz; mevcut ödenmiş siparişin ataması `reconcile` ile düzeltilmelidir. Süre dolduktan sonra kullanıcı yeni bir **tek çekim satın alma** başlatabilir. **Abonelik, otomatik yenileme veya arka planda otomatik tahsilat yoktur.** Bitiş tarihi olmayan aktif `one-time` paket de tekrar aktif satın alma sayılır.

Satın alma hakkının süresi dolunca paket kaynaklı ders, video, test ve ilgili eğitim erişimi sorgularda kesilir; tarihsel sipariş ve kayıt silinmez. Eski veya yönetici tarafından açılmış kurum kayıtları `manual` erişim olarak korunur. Paket satın alınması mevcut manuel kaydı paket kaydına çevirmez; bir paket süresinin dolması bağımsız kurum erişimini kaldırmaz. Yönetici ekranında erişimin kaynağı ve süresi görülebilir; aktif satın alma hakkı bulunan kaydı normal kayıt silme işlemiyle kaldırmak engellenir.

### İçerik erişiminde sınıf ve ders sınırı

Aynı sınıf seviyesi, aynı satın alma kapsamı anlamına gelmez. Paket kaynaklı erişim, ödeme ve geçerlilik denetimlerinden geçmiş gerçek sınıf kimlikleriyle sınırlandırılır. Paralel iki 8. sınıf/şube, yalnız `gradeLevel: 8` ortak olduğu için birbirinin video, ödev veya testlerini açamaz.

| İçerik/ders kaydı | Yalnız paket kaynaklı erişim için gereken ilişki |
| --- | --- |
| İçerikte `gradeId` var | İçeriğin sınıf kimliği öğrencinin aktif erişim sınıflarından biriyle bire bir aynı olmalıdır. Sadece seviye eşleşmesi yeterli değildir. |
| İçerikte `gradeId` yok; `Subject.gradeId` var | Aktif dersin sınıf kimliği öğrencinin aktif erişim sınıfıyla eşleşmeli; ders ve içerik seviyeleri de tutarlı olmalıdır. |
| İçerikte ve derste `gradeId` yok | Aktif ortak ders, öğrencinin erişebildiği gerçek sınıfa bir `TeacherAssignment` ile bağlanmış olmalı; ders/içerik seviyesi bu sınıfla aynı olmalıdır. |
| İçerik sınıfsız ve bu ders bağlantıları da yok | Yalnız `gradeLevel` eşleşmesiyle paket hakkı verilmez. Sınıfsız/derse bağlanmamış eski kayıtlar paket alıcısına kendiliğinden açılmaz. |

Başka bir sınıfa açıkça bağlı `Subject.gradeId`, hatalı bir öğretmen ataması eklenerek yetkili hâle getirilemez. Ders listeleri de aynı sınıf/ders sınırını uygular; bir içeriğin kimliğini bilmek bu denetimi aşmaz. Yetkilendirme, kullanıcının gönderdiği sınıf seviyesi veya paket adından türetilmez.

`accessSource: manual` ve erişim kaynağı alanı olmayan eski kurum kayıtları için, yalnız bu bağımsız hakların ait olduğu seviyelerde eski sınıfsız/global ders ve derssiz içerik uyumluluğu korunur. Bu uyumluluk başka bir açık sınıf kimliğine bağlı içeriği açmaz ve yalnız paket kaynaklı bir seviyeye taşınmaz. Manuel kurum hakkı ile geçerli paket hakları birlikte değerlendirilir; paket süresi dolduğunda bağımsız manuel hak devam eder. Paket kısıtını kaldırmak amacıyla satın alma kaydını manuel kayda çevirmek yapılandırma çözümü değildir.

AtlasAI çalışma bağlamındaki ödev ve canlı ders bilgileri de gerçek sınıf ve doğrulanmış ders bağlantılarıyla sınırlandırılır. Paket kaynaklı aynı-seviye genel fallback uygulanmaz; bağımsız manuel/eski kurum seviyelerinin sınırlı uyumluluğu korunur. Bu erişim sınırı, ayrıca uygulanan onaylı müfredat denetiminin yerine geçmez.

AI test analizi ayrı değerlendirilmelidir: öğrencinin kendi sonuçlarından `testId → questionId` ilişkisi izlenir ve cevap anahtarları dışarı verilmez. Öğrencinin tarihsel kendi sonuçları, güncel sınıfı değişti diye silinmez; bütün geçmiş test analizlerinin yalnız bugünkü sınıf içeriklerinden oluştuğu iddia edilmez. Öğretmenin test analizinde ise güncel aktif sınıf/ders ataması birlikte doğrulanır.

## Ödeme iş akışı

1. `GET /cart`, aktif öğrenci/velinin sunucuda saklanan kendi sepetini döndürür. Sepet bir paket, bir öğrenci ve sabit bir adet içerir; genel amaçlı çok ürünlü sepet değildir. Öğrenci kendisi için; veli güncel bağlı öğrencisi için seçim yapar.
2. `PUT /cart/item`, mevcut `revision` ile paket/öğrenci seçimini kaydeder. İstemciden adet, fiyat veya toplam alınmaz. Hesap/paket uygunluğu `canPurchase`, ayrıca sağlayıcı hazırlığını ve değişmemiş fiyatı gerektiren ödeme uygunluğu `canCheckout` ile ayrılır. Anahtarlar eksikken seçim saklanabilir; sepet okuma/düzenleme sağlayıcı işlemi başlatmaz.
3. Güncel teklif; paket adı/açıklaması/özellikleri, fiyat, dönem, sınıf atama yöntemi ve çözülmüş sınıflar, öğrenci, satıcı, ortam ve yasal sürümlerle ilişkilidir. Bunlar değişirse `quoteChanged` işaretlenir; okuma yeni fiyatı sessizce kabul etmez. Kullanıcı güncel bilgiyi yeniden `PUT /cart/item` ile onaylamalıdır. Eski `revision` veya eşzamanlı değişiklik `409` döner.
4. Alıcının gerçek T.C. kimlik numarası, telefonu, il ve fatura adresi ile `termsAccepted`, `privacyAccepted`, `salesAgreementAccepted` onayları `POST /cart/checkout` üzerinden gönderilir. Üçü de `true` olmalıdır; satış onayı ön bilgilendirmeyi de kapsar. Kimlik numarası biçim ve kontrol basamaklarıyla doğrulanır. Kart bilgileri bu forma yazılmaz; iyzico'nun sayfasında alınır.
5. API teklifi ve fiyatı yeniden doğrular, sepetin mevcut revizyonunu ödeme hazırlığı için kısa süreli kilitler ve sağlayıcı oturumu öncesinde son bir teklif kontrolü yapar. Siparişin fiyat, içerik, sınıf, satıcı ve onay snapshot'ları kaydedilir. Eşzamanlı/tekrarlanan checkout talepleri ikinci tahsilat oturumu oluşturmamak için tekilleştirilir.
6. Dönen HTTPS iyzico adresi doğrulandıktan sonra tarayıcı sağlayıcıya gider. Ağ kesilmesi yeni ödeme başlatmak için otomatik gerekçe değildir; önce mevcut sipariş kontrol edilir.
7. iyzico `POST /payment/provider-callback` adresine döner. API sağlayıcıdan sonucu alır; yanıt imzası, sipariş/işlem eşleşmesi, tutar, para birimi ve inceleme durumu doğrulanır. Sonuç sayfasına 303 yönlendirmesi yapılır. Callback URL'sindeki veya frontend sorgusundaki bir başarı ifadesi tek başına kabul edilmez.
8. Doğrulanmış canlı tahsilattan sonra sınıf ataması yapılır. Yinelenen callback/reconcile aynı erişim hakkını çoğaltmaz. Öğrenci veya sınıf bu sırada değişmişse tahsilat kaybolmaz; ödeme tamamlanmış, sınıf kaydı başarısız/bekleyen olarak ayrı saklanır. Sepet yalnız doğrulanmış ödeme ve o ödemeyi başlatan sipariş/revizyon eşleşmesiyle temizlenir; gecikmiş eski callback yeni sepet seçimini silmez.
9. Sonuç ekranı kimlik doğrulanmış `GET /payment/orders/:id` üzerinden okur. Bekleyen ödeme veya hazırlanmakta olan canlı erişim için yaklaşık bir dakika içinde en fazla 12 okuma yapar. Okuma endpointi yeni tahsilat veya yeniden atama başlatmaz. Sonuç kesinleşmezse geçmiş/detay ve açık doğrulama işlemi kullanılabilir.

Sepet; kart, alıcı kimlik numarası veya fatura adresini saklamaz. Ödeme hazırlık kilidi ve teklif parmak izi özel alanlardır. Ayrıntılı modül sözleşmesi: [Cart README](../apps/api/src/cart/README.md).

Öğrenci/veli yalnız güncel yetkisi olan siparişleri görür. Ödeme başlatma, devam etme, kapatma ve iade talebi için alıcı yetkisi sunucuda kontrol edilir. Sipariş yanıtları `canReconcile`, `canResume`, `canCancel`, `canRequestRefund` alanlarıyla kullanılabilir işlemleri belirtir. Özel checkout tokenı ve sağlayıcı ödeme sayfası URL'si normal liste/detay yanıtında yayınlanmaz.

### Ödeme ve sınıf kaydı durumları

| Alan | Anlam |
| --- | --- |
| `status: PENDING` | Ödeme henüz kesinleşmemiştir; yeni ödeme yapmadan doğrulanmalıdır. |
| `status: COMPLETED` | Ödeme tamamlanma kaydıdır; tek başına güncel ders erişimi anlamına gelmez. Eski, sağlayıcı kanıtı olmayan kayıtlar doğrulanmış tahsilat olarak sunulmaz. |
| `status: FAILED` | Ödeme tamamlanamamıştır. |
| `status: CANCELLED` | Bekleyen yerel sipariş kapatılmıştır; bankadaki işlem iptal edilmiştir anlamına gelmez. |
| `fulfillmentStatus: PENDING / PROCESSING` | Sınıf kaydı henüz hazırlanıyor/işleniyor. |
| `fulfillmentStatus: FULFILLED` | Sınıf kaydı tamamlanmıştır. Canlı ortam ve geçerli süre ayrıca gerekir. |
| `fulfillmentStatus: FAILED` | Tahsilat ile sınıf ataması ayrılmıştır; kayıt kontrol edilmeli ve uygun olduğunda yeniden denenmelidir. |
| `fulfillmentStatus: SKIPPED_SANDBOX` | Test ödemesidir; canlı öğrenci hakkı oluşturulmaz. |

`reconcile`, sağlayıcıdan ödeme durumunu tekrar doğrular; tahsilat kanıtı mevcutsa eksik sınıf atamasını yeniden deneyebilir. Aynı sipariş için yeni ücret almaz. `resume`, yalnız yetkili alıcının süresi geçerli bekleyen iyzico oturumunu açar. `cancel`, yalnız yerel bekleyen siparişi kapatır; kullanıcı açık eski ödeme sayfasını da kapatmalıdır. Kapatılmış eski oturumdan sonradan gerçek ödeme gelirse bu tahsilat kaybedilmez ve doğrulanarak kayda alınır.

Yerel kapatma iyzico oturumunu sona erdirmez. Bu nedenle eski ödeme oturumu hâlâ geçerliyken aynı öğrenci ve paket için ikinci bir ödeme oturumu açılmaz. Yeni deneme öncesinde mevcut işlemin kesin sonucu doğrulanmalı veya ödeme oturumunun güvenli süresi dolmalıdır. Sonucu belirsiz bir oturum, yalnızca ekranda kapatıldı diye yeni ödeme başlatma hakkı vermez.

Sandbox işlemleri ayrı saklanır. **Sandbox ödemesi canlı sınıf erişimi açmaz ve gerçek tahsilat toplamına dahil edilmez.** Yönetici ekranı `liveRevenue` ve `sandboxRevenue` değerlerini ayrı gösterir. Sayfalı listede özet, yalnız görünen satırları değil seçili filtrelere uyan bütün kayıtları kapsar. Tarih filtreleri Türkiye gün sınırlarıyla çalışır.

### İade talebinin sınırı

Ödeyen kullanıcı, doğrulanmış gerçek tahsilat için gerekçe girerek `refundRequestStatus: REQUESTED` oluşturabilir. Bu yalnızca kurum incelemesine yönelik yerel kayıttır. Sipariş tutarı veya tahsilat durumu bu nedenle silinmez. **Mevcut sistem iyzico/banka üzerinden para iadesi yapmaz; iade onaylama veya banka iadesi endpointi uygulanmamıştır.** Gerçek iade, kurumun yetkili personelince ödeme sağlayıcısı/banka tarafında ayrıca yürütülmelidir; panelde talep açılması para iadesi değildir. İade talebi ve bekleyen siparişi kapatma ekranları bu ayrımı açıkça belirtir.

## API özeti

| Endpoint | İşlev |
| --- | --- |
| `POST /auth/register` | Öğrenci/veli hesabı; `{ firstName, lastName, email, password, role, grade?, termsAccepted: true, privacyAccepted: true }`. |
| `POST /auth/students` | Aktif velinin bağlı öğrenci oluşturması; `{ firstName, lastName, email, password, grade, guardianConsent: true }`. |
| `POST /auth/change-password` | Mevcut şifreyle değiştirme; `{ currentPassword, newPassword }`; eski oturum sürümleri geçersizleşir. |
| `GET /packages`, `/packages/active`, `/packages/:id` | Yalnız satışa uygun aktif paket kataloğu. |
| `GET /packages/admin`, `/packages/admin/:id` | Güncel yönetici yetkisiyle tüm paket kayıtları. |
| `POST /packages`, `PATCH /packages/:id` | Yönetici paket oluşturma/düzenleme. |
| `DELETE /packages/:id` | Geçmişi koruyarak satışa kapatma. |
| `POST /packages/purchase` | Eski doğrudan satın alma yolu kapalıdır; `410 Gone` döner. |
| `GET /payment/status`, `/payment/merchant` | Herkese açık hazırlık ve satıcı bilgisi. |
| `GET /cart` | Güncel hesabın tek paketlik sepeti, revizyon, öğrenci seçenekleri, teklif/değişim, yasal sürümler ve uygunluk. |
| `PUT /cart/item` | `{ revision, packageId, studentId? }` ile sunucu fiyatını ve kapsamı onaylayarak seçim. |
| `DELETE /cart` | `{ revision }` ile yalnız kendi sepet seçimini temizleme. |
| `POST /cart/checkout` | `{ revision, identityNumber, phone, city, address, termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true }`; son teklif ve revizyon kontrolü. |
| `GET /payment/checkout-context/:packageId?studentId=…` | Alıcı, bağlı öğrenciler, fiyat, ortam, satıcı ve mevcut paket uygunluğu. |
| `POST /payment/initialize` | Eski API yolu üzerinden yeni ödeme hazırlama; `{ packageId, studentId?, identityNumber, phone, city, address, termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true, quoteHash? }`. Üç onay bu yolda da zorunludur. Yeni web akışı `/cart/checkout` kullanır. |
| `POST /payment/provider-callback` | Sağlayıcı dönüşünü doğrulama ve sonuç sayfasına yönlendirme. |
| `POST /payment/callback` | Daha önce açılmış oturumlar için uyumluluk yolu. |
| `GET /payment/students` | Satın alma hesabının erişebildiği öğrenciler. |
| `GET /payment/my-orders` | `page`, `pageSize`, `status`, `studentId` filtreleriyle yetkili sipariş geçmişi. |
| `GET /payment/active-package?studentId=…` | Seçili öğrencinin geçerli, doğrulanmış canlı paket erişimi. |
| `GET /payment/orders/:id` | Yetkili sipariş detayını salt okuma. |
| `POST /payment/orders/:id/reconcile` | Sağlayıcıdan tekrar doğrulama. |
| `POST /payment/orders/:id/resume` | Uygun mevcut ödeme oturumuna devam etme. |
| `POST /payment/orders/:id/cancel` | Alıcının bekleyen yerel siparişi kapatması. |
| `POST /payment/orders/:id/refund-request` | `{ reason }` ile yalnız yerel iade talebi. |
| `GET /payment/admin/readiness` | Yöneticiye ayrıntılı POS hazırlığı. |
| `GET /payment/admin/orders` | `q`, `status`, `environment`, `studentId`, `from`, `to`, `page`, `pageSize` ile yönetici siparişleri. |
| `GET /payment/admin/orders/:id` | Yönetici sipariş detayı. |
| `POST /payment/admin/orders/:id/reconcile` | Yönetici tarafından sağlayıcı/sınıf ataması doğrulaması. |

Sayfalı sipariş yanıtı `{ items, pagination, summary, summaryScope: "matchingFilters" }` biçimindedir. Sayfalama `page`, `pageSize`, `total`, `totalPages`; özet ise ödeme durumlarının sayıları, `liveRevenue`, `sandboxRevenue`, `fulfillmentPending` ve `refundRequests` alanlarını içerir. Filtre ve nesne kimlikleri sunucuda doğrulanır. Yetki, yalnız tarayıcıdaki rol veya eski JWT rolüne dayanmaz; aktif hesap ve güncel veritabanı rolü/öğrenci bağlantısı kontrol edilir.

Eski web adresinin korunması yeni ödeme çağrılarında hukuki onayları atlama yolu değildir. Daha önce açılmış sağlayıcı oturumlarının callback/reconcile yolları mevcut işlem kanıtıyla çalışmayı sürdürür; kullanıcının yeni bir onay isteği göndermemesi nedeniyle gerçek tahsilat kaybolmaz.

## Kamu kataloğunu değiştirmeden inceleme

[Salt okunur katalog betiği](../scripts/audit-commerce-catalog.cjs), açıkça verilen API kökünün yalnız `/packages/active` ve `/education/grades` yanıtlarını inceler:

```sh
npm run audit:commerce -- --api https://api.example.com --output /tmp/atlas-catalog-review.json
```

`--api` zorunludur; örnek adres yerine incelenecek gerçek API kökü yazılmalıdır. Betik giriş yapmaz, sır okumaz, paket fiyatı/sınıfı değiştirmez ve ödeme başlatmaz. İsteğe bağlı `--all-level-package PAKET_ID`, belirli bir paketin 1–8 kapsamı için eksik seviyeleri ve mevcut sınıf adaylarını raporlar; otomatik sınıf seçmez veya paket yayınlamaz.

30 Ekim 2026 tarihli yerel kamu katalog raporu, o andaki canlı kamu API'sinde görülen 8 paketin tümünde sınıf eşleştirmesinin boş olduğunu ve 5. seviye için aktif sınıf adayının bulunmadığını kaydeder. Birden fazla şube olan seviyelerde kurumun bilinçli seçim yapması gerekir. Bu rapor tarihli bir durum kaydıdır; yerel geliştirmelerin üretime dağıtıldığı, sonraki katalog durumunun aynı kaldığı, taslak/pasif paketlerin ya da ders içeriklerinin denetlendiği anlamına gelmez. Fiyatlar ve canlı kayıtlar bu incelemeyle değiştirilmemiştir.

İşletmenin onayıyla Plus/Odak/Koçluk paketlerinin kapsamı 30 Ekim 2026'da canlı veritabanına uygulandı: üç pakette `gradePolicy: student-level` ve 1–8. seviyelerin seçilmiş sınıf kimlikleri kaydedildi. Onaylı seçimler arasında **6. sınıf → Pusula Sınıfı**, **7. sınıf → Keşif Sınıfı**, **8. sınıf → genel “8. Sınıf” kaydı** bulunur; aynı seviyedeki diğer şubeler bu seçime dâhil değildir. İşletmenin içeriğini hazır olarak doğruladığı **5. Sınıf** kaydı da oluşturuldu. Canlı katalog kimlikleri, işlem raporu ve geri dönüş kopyası yerel işletim kayıtlarında saklanır. Paketlerin fiyatı, dönemi, adı ve aktifliği korundu; ödeme, kod dağıtımı veya yeni öğrenci kaydı yapılmadı. Yeni uygulama kodu henüz yayınlanmadı; ders/öğretmen bağlantıları ve öğrenci erişimi işletimde ayrıca doğrulanmalıdır. Önceki kamu katalog raporu, uygulama öncesinin tarihli anlık kaydı olarak korunur.

### Ayrı LGS tekliflerinin ders kapsamını hazırlama

LGS Sayısal, Sözel, Ana veya Tüm Dersler gibi farklı teklifler, adlarındaki sözcüklerden otomatik ders hakkı kazanmaz. Paket adı, açıklaması ve özellikleri bir yetkilendirme kuralı değildir. Aynı `gradeId` kümesine bağlanan iki paket yalnız farklı isim taşıdıkları için farklı ders kapsamlarına ayrılmaz.

Kısmi ders paketlerinin ayrı kapsamı olacaksa kurum önce gerçek sınıf/şube kayıtlarını seçmeli veya oluşturmalı, paketin `gradeIds` eşleştirmesini buna göre yapmalı ve o sınıfın derslerini açıkça ilişkilendirmelidir. Sınıfa özel ders için `Subject.gradeId`; sınıf kimliği olmayan ortak ders için ilgili sınıf ve dersin `TeacherAssignment` bağlantısı kullanılmalıdır. Öğretmen ataması gerçek sınıf, ders ve sınıf seviyesiyle tutarlı olmalıdır. Bir paketi tüm dersler paketi olarak adlandırmak, eksik sınıf/ders bağlantılarını tamamlamaz.

Yeni materyaller mümkün olduğunda doğrudan gerçek `gradeId` ve ilgili `subjectId` ile oluşturulmalıdır. Sınıf kimliği eksik eski içerik, yalnız aynı seviyede bulunduğu için her paket alıcısına açılacak bir ortak havuz olarak değerlendirilmemelidir. Yapılandırma tamamlandığında her teklifin kendi öğrencisiyle izin verilen ve verilmeyen dersler ayrıca kontrol edilmelidir. Canlı veritabanına uygulanan değişiklik yalnız onaylı Plus/Odak/Koçluk kapsamları ve eksik 5. sınıf kaydıdır; LGS teklifleri ile ayrı 4. Sınıf Okul Desteği ve Ortaokula Hazırlık paketi değiştirilmedi. Bu kapsam kaydı ders/`TeacherAssignment` kurulumunu veya öğrenci erişimini tek başına doğrulamaz; kısmi LGS tekliflerinin canlıda bütünüyle hazır olduğu anlamına gelmez.

## Gerçek ödeme yapmadan doğrulama

İşlem doğrulama, kullanıcının bankadan tarayıcıya geri dönmesine bağlı kalmamalıdır. İşyeri hesabında [iyzico HPP V3 bildirimi](https://docs.iyzico.com/ek-servisler/webhook) açıldığında ayrıca API'deki `/payment/provider-webhook` yolu kullanılır. Bildirimin imzası, sipariş ve token eşleşmesi ile iyzico'dan alınan güncel sonuç doğrulanır. Mevcut tarayıcı dönüşü ayrı çalışır. Test ve canlı bildirim adresleri ayrı doğrulanmalı; işyeri panelinde gerçek teslim görülmeden otomatik erişim hazır sayılmamalıdır.

Mevcut Checkout Form entegrasyonu, iyzico işyeri onayı alınırsa tercih edilen yoldur. Başvuru onaylanmazsa ilk alternatif [PayTR iFrame](https://dev.paytr.com/iframe-api): kart ekranı sağlayıcıda kalır, [sunucu bildirimi hash ile doğrulanır](https://dev.paytr.com/iframe-api/iframe-api-2-adim) ve testten canlıya ayrı geçilir. [Sipay Sanal POS](https://sipay.com.tr/odeme-cozumleri/online-odeme-cozumleri/sanal-pos/) ve [Garanti BBVA Switch ortak ödeme](https://dev.garantibbva.com.tr/switch-ortak-odeme-kredi-karti-ile-odeme) ikinci seçeneklerdir. Bu sağlayıcılar için işyeri kabulü, komisyon, valör, taksit ve iade koşulları yazılı teklif üzerinden karşılaştırılır; bu depoda aktif bir ikinci sağlayıcı bulunmaz. Farklı bir sağlayıcıya geçişte mevcut iyzico siparişlerinin sorgulama ve iade kayıtları korunmalıdır.

Proje kökünde:

```sh
npm run verify:commerce
npm run verify:auth-navigation
npm run verify:api-session
# Aynı betiğin doğrudan çalıştırılması:
node scripts/verify-commerce.cjs
node scripts/verify-auth-navigation.cjs
node scripts/verify-api-session.cjs
```

Bu kontrol, gerçek Nest endpointleri ve Mongoose modellerini **ayrı, geçici bir yerel MongoDB** ile çalıştırır. Bağlantının `127.0.0.1` üzerindeki `atlas_commerce_verify` veritabanı olduğunu doğrular; üretim veya kalıcı yerel derslik veritabanını kullanmaz. Yalnız ödeme sağlayıcısı ve hız sınırı sayacı test yerine geçirilir. Gerçek iyzico/banka çağrısı veya para hareketi yapılmaz. İlk çalıştırmada yerel test runtime'ı ve MongoDB çalıştırıcısı indirilebilir; bunlar ödeme çağrısı değildir.

Ticaret kontrolü; gerçek giriş/yetki sınırlarını, öğrenci/veli üyeliğini, veli onayıyla öğrenci oluşturmayı, şifre değişiminde eski oturumu geçersizleştirmeyi, paket yayınlama kurallarını, hesaba ait sepet ve değişmiş teklif/revizyonları, fiyatın sunucudan alınmasını, eşzamanlı checkout tekilliğini, imzalı ve yinelenen callback'leri, sınıf erişimi/bitişini, yenilemeyi, atama hatasının düzeltilmesini, yerel kapatma sonrasındaki geç tahsilatı, token gizliliğini, aile erişimini, yerel iade talebini ve sandbox/gerçek gelir ayrımını sınar. Test hesapları ve işletme alanları yalnız geçici doğrulama verisidir; uygulama kataloğuna sahte satın alma kaydı eklenmez.

`verify:auth-navigation`, gerçek `apps/web/src/lib/auth-navigation.ts` fonksiyonlarını çalıştırır. Giriş/kayıt dönüşünde paket ve öğrenci seçiminin korunması, eski ödeme adresinin sepete çevrilmesi, role uygun panel adresleri ve dış adres/geçersiz kimlik/ek fiyat parametrelerinin reddi kontrollerini yapar. Ağ, tarayıcı veya kişisel veri kullanmaz. Bu kontrol görsel tarayıcı testi yerine geçmez.

Başarılı çalışmanın sonunda özet `actualProviderCalls: 0` ve `disposableDatabase: true` değerlerini verir. Geçici API ve MongoDB kapatılır. Bu doğrulama, canlı iyzico hesabının banka tarafından onaylandığını veya gerçek tahsilat yapıldığını kanıtlamaz; canlı geçiş ve gerçek işlem kontrolü ayrı, açık yetkilendirilmiş işletim adımlarıdır.

`.github/workflows/verify.yml`, yayın bağımlılıklarında yüksek ve kritik açık taramasını, giriş/yetki kontrollerini, API testlerini, geçici veritabanında ticaret ve ortak AtlasAI bütçe kontrolünü ve API/web derlemelerini çalıştırır. PR ve ana dal değişikliklerine ek olarak ana dalda her gün 05:25 Türkiye saati için tanımlıdır. Günlük çalışma, iş akışı ana dala girdiğinde GitHub üzerinde devreye girer.

## Kalan sınırlar

- Sepet tek paket ve tek öğrencilik seçim içindir; çok ürün/adet, kupon ve çoklu para birimi uygulanmamıştır.
- Gerçek banka iadesi ve e-Fatura/e-Arşiv entegrasyonu uygulanmamıştır; yerel iade talebi ve sipariş detayı bu işlemlerin yerine geçmez.
- E-posta doğrulama ve e-posta üzerinden self servis şifre sıfırlama yoktur; mevcut şifreyle değiştirme ve resmî destek kanalı vardır.
- iyzico hesabının kabulü, canlı/sandbox anahtarlarının doğruluğu, dış HTTPS callback erişimi ve gerçek tahsilat/iade testi ayrıca doğrulanmalıdır. Bu depodaki kontrol, sağlayıcı yerine yerel test yanıtı kullanır.
- Yasal metinler, gerçek işletme uygulamalarıyla ve veri aktarım düzeniyle birlikte güncel tutulmalıdır; sayfaların eklenmesi üretime dağıtım veya sağlayıcı onayı değildir.
