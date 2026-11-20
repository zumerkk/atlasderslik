# AtlasAI — 20 Kasım 2026 doğrulaması

Bu sürüm soru fotoğrafını sohbetten görsel anlatıma taşır; yeni kitap/yıldız kimliğini, güvenli Markdown/tablo/formül gösterimini ve sola döndürme düğmesini ekler. Fotoğraf, taslak ve cevaplar hesap/öğrenci/konu değiştiğinde birbirine karışmaz. PDF ekranında bağlantı hatası ile eksik müfredat ayrı gösterilir.

Eğitim yanıtları, görsel sorunun okunması ve son doğruluk kontrolü sunucunun `OPENAI_REVIEW_MODEL` ayarını kullanır; varsayılan `gpt-6-sol`dur. Ders videosu özeti ve bağımsız kaynak denetimi de inceleme modelini kullanır. Ürün yardımı mevcut temel modeli kullanır. Her model isteği kendi fiyatıyla ortak bütçeden rezervasyon yapar; açıkça seçilen model çalışmazsa başka sağlayıcıya geçilmez. Model seçimi istemci DTO'sunda kabul edilmez. Anahtar yalnız API servisinin özel ortamında bulunur.

Son doğruluk denetimi yalnız doğru şıkkı kontrol etmez: görünen her seçeneği bağımsız tarif eder, yanıtın seçeneklere ilişkin açıklamalarını tek tek karşılaştırır. Yanlış gerekçeler ve doğrulanamayan çizimler gösterilmez. Bu kontroller mutlak doğruluk garantisi değildir.

Sıvı basıncındaki desteklenen üç aşamalı kap şeması sabit kodla çizilir. Eşit sıvı alanı, sabit taban/duvar uzunluğu, yatay yüzeyler ve sıfırın üzerinde minimum basınç korunur. Şık sorudaki grafiklerden çıkarılır. Diğer görseller mevcut görsel üreticisine gider; ikisi de özgün soru ve güncel kazanım denetiminden geçer. Okunamayan kaynak için `ATLAS_INPUT_UNREADABLE`, doğrulanamayan çıktı için `ATLAS_OUTPUT_REVIEW_FAILED` kodu döner.

## Doğrulama

- API: 30 takım / 791 test; API üretim derlemesi başarılı.
- Web: TypeScript, 69 sayfalık üretim derlemesi ve standalone dosya kontrolü başarılı.
- Gerçek Chrome: 23 öğrenci/sohbet, 10 yönetici/müfredat, 10 fotoğraf döndürme kontrolü; toplam 43 kontrol.
- Geçici veritabanıyla 20 ticaret, 36 giriş/yönlendirme, 3 oturum değişimi kontrolü başarılı; gerçek tahsilat/iade yapılmadı.
- Tarihli üretim bağımlılık taraması: bütün önem düzeylerinde bilinen açık yok. KaTeX 0.18.2 hem doğrudan hem geçişli bağımlılıklarda sabitlenmiştir.
- Gerçek OpenAI ile aynı sıvı basıncı fotoğrafında C ve A/B/D gerekçeleri doğru üretildi; uygulamanın çizdiği PNG özgün soruyla birlikte denetlendi. Daha önce doğru şıkla birlikte yanlış A/B/D gerekçesi veren aday yeni denetim tarafından reddedildi. Test onayları ve hesapları geçici yerel veritabanındadır; canlı MEB onayı olarak kullanılamaz.
- ESLint kontrolünde mevcut dosyalardaki iki eski React hooks kuralı komut düzeyinde kapatıldı; kural yapılandırması değiştirilmedi. Tam lint'in koşulsuz temiz olduğu iddia edilmez.

## Canlı müfredatın tamamlanması

Canlı katalogla 46/46 ders kimliği eşleşen salt okunur denetimde 626 konu ve **0 onaylı AtlasAI müfredat kaydı** bulundu. Anahtarın açılması bu kayıtları onaylamaz. Ders üretimi, öğrencinin aktif erişimi ve öğretmen/yönetici tarafından kaynakla eşleştirilmiş güncel kazanım gerektirir; ürün yardımı bu kurulumdan bağımsız çalışabilir.

Yönetici **Konular → Müfredat onayı** ekranında sınıfı seçer. 8. sınıf Fen Bilimleri **İklim ve Hava Durumu** ve **Sıvılarda Basınç** için **Resmî kaynak taslağını doldur** düğmesi vardır. Bu düğme yalnız formu doldurur. Belge incelenir, taslak kaydedilir, inceleme notuyla ayrıca onaylanır. Diğer konular da aynı kaynak kontrolüyle doldurulmalıdır. Taslak değişikliği önceki onayı kaldırır; öğretmen sınıf/ders yetkisi doğrulanır.

2026–2027'de 7. sınıf normal İngilizce önceki programı kullanır; diğer derslerin TYMM uygulaması İngilizceye otomatik taşınmaz. Bilinmeyen gelecek öğretim yılları kendiliğinden açılmaz.

8. sınıf Fen F.8.3.1.2'nin matematiksel bağıntı sınırı korunur. Nitel derinlik/basınç karşılaştırmaları ve sayısal ölçek gerektirmeyen grafik yorumları kabul edilir; basınç formülünün türetilmesi ve sayısal basınç hesabı kabul edilmez. Bu yorumun ölçme örneği [Diyarbakır MEB 8. sınıf testi, soru 3](https://diyarbakirodm.meb.gov.tr/meb_iys_dosyalar/2020_04/26110840_FEN_BYLYMLERY_TEST-3.pdf); kazanımın asıl kaynağı [MEB 2018 Fen programı, basılı s. 49 / PDF s. 51](https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf).

`ATLAS_OPENAI_ENABLED` ve kalan bütçe ayarı Blueprint senkronizasyonunda özel ortamdan korunur. Önceki kontrollü testler için pay bırakılarak üretim limiti 48 USD olarak ayarlanır; aynı veritabanındaki 30 günlük ortak sayaç yeniden dağıtımda sıfırlanmaz. Ödeme tahsilatı kendi sağlayıcı onayına bağlı ayrı anahtarla kapalı kalır.
