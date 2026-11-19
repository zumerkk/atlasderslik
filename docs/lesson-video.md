# Atlas ders kaydı yükleme ve özetleme

Öğretmen, **Video Kütüphanesi → Video Ekle → Video dosyası** üzerinden atanmış sınıfını, dersini ve yönetici tarafından onaylanan müfredat konusunu seçer. MP4 ve WebM dosyaları kabul edilir. Varsayılan sınırlar 256 MB, 60 dakika ve 4K çözünürlüktür. Video bağlantıları mevcut davranışlarını korur; bağlantının başlığından veya açıklamasından bir video özeti üretilmez.

Öğrenci sınıfına ait kaydı açıp **AtlasAI ders özeti → Özet çıkar** düğmesini kullanır. Öğretmen kendi kaydı için aynı işlemi yapabilir. Özet talebi MongoDB'de saklanır; işlem API süreci yeniden başladıktan sonra devam eder. Önceden üretilmiş, aynı video ve güncel onaylı müfredata ait özet yeniden kullanılır.

## Analizin kapsamı

Kaydın sesinin tamamı, en fazla 10 dakikalık MP3 parçaları halinde OpenAI transkripsiyon servisine gönderilir. Ayrıca kaydın süresine yayılan en fazla 12 örnek kare çıkarılır; tahta ve sunumlar görüntü anlayabilen OpenAI modeline bu karelerle iletilir. Kare örneklemesi videodaki her görüntüyü incelemez. Bu sınır öğrenciye özetin altında açıklanır. Zaman bağlantıları yaklaşık ses bölümü başlangıcını veya örnek kare zamanını gösterir.

Girişin onaylı kazanımlarla eşleşmesi, üretilen özetin gerçek ses/kare dayanakları ve son metnin müfredat kapsamı ayrı denetimlerden geçer. Video veya müfredat işlem sırasında değişirse eski içerik yayınlanmaz. Anlaşılmayan, kapsam dışındaki veya doğrulanamayan içerik için özet paylaşılmaz. Ses/görüntü çıkarımı başarısızsa ders adı veya açıklamasına dayanan bir özet oluşturulmaz. Model denetimleri olasılıksaldır; kesin anlamsal doğruluk garantisi oluşturmaz.

## Sunucu ayarları

| Ayar | Varsayılan / kullanım |
| --- | --- |
| `OPENAI_API_KEY` | Yalnızca API sunucusunda tutulur; özetleme için gereklidir. |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe`; ses parçaları da ortak AtlasAI bütçe denetiminden geçer. |
| `OPENAI_MODEL` | Atlas'ın mevcut OpenAI metin/görsel modeli; hesabın bu modele erişimi bulunmalıdır. |
| `ATLAS_VIDEO_STORAGE_DIR` | Yerelde API çalışma dizininde `.atlas-media/videos`. Üretimde bağlı kalıcı diskin içindeki ayrı mutlak yol; Render örneği `/var/data/atlas-videos`. |
| `ATLAS_VIDEO_STORAGE_MOUNT` | Üretimde gerçek, yazılabilir Linux disk bağlama noktası; Render örneği `/var/data`. Yapılandırma, kalıcı depolamanın altında ayrı bir video dizini gerektirir. |
| `ATLAS_VIDEO_MAX_UPLOAD_MB` | `256`; sunucu en fazla 256 MB kabul eder. |
| `ATLAS_VIDEO_MAX_MINUTES` | `60`; üst sınır 90 dakikadır. |
| `ATLAS_VIDEO_MAX_FRAMES` | `12`; üst sınır 12 karedir. |
| `ATLAS_VIDEO_DAILY_SUMMARIES` | Hesap başına İstanbul gününe göre `6`; MongoDB'de atomik kota uygulanır. |
| `ATLAS_VIDEO_STORAGE_MAX_GB` | Tüm yüklenen kayıtlar için `20` GiB varsayılan uygulama bütçesi. Render tanımında 10 GB diske `8` GiB bütçe ayrılır; yüklemeden önce dosya sisteminin gerçek boş alanı da kontrol edilir. |
| `FFMPEG_PATH`, `FFPROBE_PATH` | İsteğe bağlı mutlak çalıştırılabilir dosya yolları. Boşsa `ffmpeg-static` ve `ffprobe-static` kullanılır. |

`ffmpeg-static` kurulum sırasında platforma uygun bir dosya indirir. Barındırma sağlayıcısında ilgili bağımlılığın kurulum adımı çalışmalıdır; kurulum betikleri kapatılan ortamlarda `FFMPEG_PATH` ve `FFPROBE_PATH` ile önceden kurulan çalıştırılabilir dosyaların mutlak yollarını belirtin. Render API derlemesi iki dosyayı `-version` ile çalıştırarak kontrol eder. `/lesson-videos/status` kimlik doğrulanmış kullanıcıya yerel yükleme ve özetleme hazırlığını gösterir; bir sağlayıcı çağrısını veya kullanılabilir bütçeyi kanıtlamaz.

## Barındırma ve erişim

Dosyalar web sunucusunun herkese açık klasörüne konulmaz. Depolama anahtarı ve dosya özeti normal eğitim yanıtlarında seçilmez. Oynatma, kimlik doğrulanan kullanıcıya verilen bir saatlik imzalı erişim bileti üzerinden gerçekleşir. Her oynatma/aralık isteğinde hesabın etkinliği ve güncel sınıf veya öğretmen yetkisi yeniden kontrol edilir. Proxy erişim kayıtlarında oynatma bileti içeren sorgu dizilerini kaydetmeyin.

API tek bir örnek üzerinde çalışıyorsa o örneğe bağlı kalıcı disk uygundur. Birden çok API örneği kullanıldığında dosyaların tüm örneklerden erişilebilir olması gerekir; yalnızca MongoDB kuyruğunu paylaşmak yeterli değildir. Mevcut dosya adaptörü yerel/bağlı disk içindir. Disk anlık görüntüsü/yedeği, MongoDB video kayıtlarıyla birlikte planlanmalıdır. Üretimde disk yoksa veya video dizini bağlı diskin dışında/yazılamaz durumdaysa yükleme ve özet işleme kapanır; çalışma dizinindeki geçici depolamaya sessizce geçilmez. [Render ve Vercel kurulum ayrıntıları](deployment.md).

Kuyruk işi MongoDB'de atomik olarak alınır ve çalışan kimliğiyle korunur. Sağlıklı çalışan, iki dakikalık iş sahipliği süresini 20 saniyede bir ve aşama geçişlerinde yeniler. Kesilen çalışanın işi sahiplik süresi dolunca diğer denemeye alınabilir; eski çalışan sonucu yayınlayamaz. Geçici ve yeniden denenebilir servis hatalarında toplam en fazla iki deneme yapılır. Bütçe reddi, kalıcı sağlayıcı hatası, kaynak/müfredat değişikliği veya doğrulanamayan içerik otomatik olarak yeniden denenmez. Son denemesi kesilen iş, sağlayıcı kapalı olsa da sahiplik süresi dolduğunda başarısız duruma geçirilir. Daha eski çalışanların verdiği 20 dakikalık sahiplik süreleri mevcut kayıtlarında korunabilir.

Günlük kota ve özet tekrar kullanımına ait benzersiz indeksler, canlıda `autoIndex=false` olsa da modül başlangıcında oluşturulur. Geçici ses, kare ve işlem klasörleri normal başarılı ve başarısız işlemlerden sonra temizlenir. Ani süreç kesintisinden kalan geçici dosyalar işletim ortamının geçici disk yaşam döngüsüne tabidir. Yüklenen kaydı silmek, özel dosyayı ve ilgili özet işlerini de siler.

## Doğrulama

Video modülü ile eski video uçlarının güvenlik kontrolleri; sınıf/yetki izolasyonu, süresi dolmuş paket hakkı, devre dışı hesap, imza ve süre aşımı, geçersiz yükleme, kalıcı disk, iş sahipliği, bütçe, geçici dosya temizliği, veri kaynağı denetimi, müfredat güncellenmesi, kota ve indeksleri kapsar. Gerçek OpenAI analizi ayrıca yetkili bir API anahtarı, kullanılabilir bütçe ve onaylı güncel müfredatla çalıştırılmalıdır.
