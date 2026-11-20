# Atlas Derslik — Online Eğitim Platformu

Atlas Derslik, okul dersleri ve LGS hazırlık sürecine yönelik bir online eğitim platformudur. Öğretmen, öğrenci, veli ve admin rollerini destekler. Kamuya açık öğrenci üyeliği ve paket satın alma 1–8. sınıf aralığındadır; satın alınabilen kapsam gerçek paket/sınıf eşleştirmeleriyle belirlenir.

## AtlasAI

Hareketli Atlas maskotu, öğrenci sınıfına göre onaylı MEB kazanımlarıyla sınırlandırılan OpenAI sohbeti, fotoğraflı soru çözümü, gelişim analizi, kalıcı çalışma planı ve logolu/filigranlı PDF materyalleri. Sisteme yüklenen ders kayıtlarında ses dökümü ve örnek görüntü karelerinden istek üzerine özetleme. Kurulum ve veri sınırları için [AtlasAI rehberi](docs/atlas-ai.md), doğrulama sonuçları için [uygulama notu](docs/atlas-ai-implementation-report.md).

Üyelik, hesaba ait sepet, paket/sınıf politikaları, veli/öğrenci siparişleri, yasal metin sürümleri, iyzico kurulumu ve gerçek ödeme yapmadan doğrulama için [ticaret rehberi](docs/commerce.md). Bu belgedeki uygulama durumu üretime dağıtım veya ödeme sağlayıcısının işletmeyi onayladığı anlamına gelmez.

## Üyelik ve satın alma akışı — 30 Ekim 2026

- Kayıt yalnız öğrenci/veli rolüne açıktır; öğrenci sınıfı 1–8, kullanım/gizlilik bildirimleri zorunludur. Veli, yasal temsilci onayıyla kendisine bağlı öğrenci hesabı oluşturabilir. Ücretsiz hesap eğitim hakkı oluşturmaz.
- Paket kartları ve `/packages/:id` detayları `/cart` akışına bağlanır. Giriş/kayıt sırasında seçilen paket ve öğrenci güvenli yerel dönüş adresiyle korunur; eski `/payment?packageId=…` adresi sepete yönlenir.
- Sunucudaki sepet bir paket ve bir öğrenci içerir. Tutar sunucudan alınır; değişmiş fiyat/kapsam/yasal sürüm ve eski sepet revizyonu yeniden onay gerektirir. Sağlayıcı hazır değilse sepet saklanabilir, ödeme başlatılamaz.
- `gradePolicy: fixed` aynı seviyedeki atanmış şubeleri; `student-level` ise yönetici tarafından açıkça seçilen 1–8 sınıfları arasından öğrencinin güncel tek seviyesine uyan sınıfı kullanır. Birden çok seviyenin pakette listelenmesi öğrenciye tüm sınıfları açmaz. Belirsiz/eksik eşleşmede satın alma kapanır.
- Ödeme doğrulaması ve sınıf ataması ayrı durumlarla izlenir. Aylık/yıllık erişim doğrulanmış ödeme tarihinden 1/12 takvim ayı sürer; tek seferlik pakette mevcut uygulama süre sonu üretmez. Otomatik yenileme yoktur; sandbox canlı ders erişimi açmaz.
- Satıcı kimliği, iletişim, kullanım/gizlilik, ön bilgilendirme, satış sözleşmesi ve iptal/iade sayfaları vardır. Kabul edilen sürümler siparişe kaydedilir; yayımlanan metinler ile API sürüm ayarları birlikte tutulmalıdır.

## Teknoloji Stack

| Katman      | Teknoloji                                        |
|-------------|--------------------------------------------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Radix UI |
| **Backend**  | NestJS 11, Passport + JWT, Mongoose             |
| **Veritabanı** | MongoDB (Atlas veya local)                    |
| **Ödeme**    | Iyzico Checkout Form                            |
| **Monorepo** | Turborepo + pnpm workspaces                     |
| **Deploy**   | Render.com (render.yaml)                         |

## Proje Yapısı

```
atlas-derslik-monorepo/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── shared/       # Shared types & constants (UserRole, etc.)
│   └── ui/           # Shared UI components
├── render.yaml       # Render.com deployment config
├── turbo.json        # Turborepo config
└── pnpm-workspace.yaml
```

## Ön Gereksinimler

- **Node.js** ≥ 20.19
- **pnpm** 10.x (`npm install -g pnpm@10`)
- **MongoDB** (local veya Atlas cloud)

## Kurulum

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. API env dosyasını oluştur
cp apps/api/.env.example apps/api/.env
# .env dosyasını düzenle: MONGO_URI, JWT_SECRET, vb.

# 3. Web env dosyasını oluştur
cp apps/web/.env.example apps/web/.env
```

## Çalıştırma

Bağımlılıklar hazırsa, dört deneme hesabı ve kalıcı yerel MongoDB ile bütün uygulamayı başlatmak için:

```sh
npm run local
npm run local:status
# Kapatmak için: npm run local:stop
```

Giriş adresi `http://localhost:3000/login`. Deneme parolaları git dışında tutulan `.atlas-local/credentials.json` dosyasındadır. İlk kurulum MongoDB çalıştırıcısını indirir; uygulama bu bilgisayardaki ayrı `atlas_local` veritabanını kullanır. Ayrıntılar: [yerel deneme rehberi](docs/atlas-local-seed.md).

```bash
# Tüm uygulamaları geliştirme modunda başlat (turbo)
pnpm dev

# Veya ayrı ayrı:
cd apps/api && pnpm dev    # API: http://localhost:3001
cd apps/web && pnpm dev    # Web: http://localhost:3000
```

## Build

```bash
pnpm build              # Tüm workspace'i derle
cd apps/api && pnpm build   # Sadece API
cd apps/web && pnpm build   # Sadece Web
```

## Ortam Değişkenleri

### API (`apps/api/.env`)

| Değişken              | Açıklama                          | Zorunlu |
|----------------------|-----------------------------------|---------|
| `MONGO_URI`          | MongoDB bağlantı URI'si          | ✅      |
| `JWT_SECRET`         | JWT imza anahtarı                | ✅      |
| `PORT`               | API portu (default: 3001)        | ❌      |
| `NODE_ENV`           | development / production         | ❌      |
| `CORS_ORIGIN`        | İzinli originler (virgülle)      | ❌      |
| `FRONTEND_URL`       | Frontend URL (ödeme callback)    | ❌      |
| `IYZICO_API_KEY`     | Iyzico API anahtarı              | ❌*     |
| `IYZICO_SECRET_KEY`  | Iyzico gizli anahtar             | ❌*     |
| `IYZICO_BASE_URL`    | Iyzico API URL                   | ❌*     |

*Ödeme özelliği kullanılacaksa zorunludur.*

### Web (`apps/web/.env`)

| Değişken                | Açıklama               | Zorunlu |
|------------------------|------------------------|---------|
| `NEXT_PUBLIC_API_URL`  | Backend API URL'si     | ✅      |

## Roller ve Yetkiler

| Rol       | Açıklama                                     |
|-----------|----------------------------------------------|
| `ADMIN`   | Tüm sistem yönetimi, kullanıcı/ders/paket    |
| `TEACHER` | Ders/ödev/video/soru yönetimi, kendi sınıfları |
| `STUDENT` | Ders görüntüleme, ödev teslim, canlı ders     |
| `PARENT`  | Bağlı öğrenci takibi, veli onayıyla öğrenci hesabı, paket/sepet/sipariş işlemleri |

## Canlıya hazırlık (Render.com)

Depoda `render.yaml` Blueprint yapılandırması bulunur. Aşağıdaki hazırlık adımları, bu geliştirmelerin canlıya dağıtıldığı veya sağlayıcı tarafından onaylandığı anlamına gelmez:
1. Render Dashboard → **Blueprint** → GitHub repo bağla
2. `MONGO_URI` ve `JWT_SECRET` ortam değişkenlerini ayarla
3. Web servisi için `NEXT_PUBLIC_API_URL`'yi API servisinin URL'si olarak ayarla

Ödeme için ayrıca gerçek satıcı bilgileri, ilgili ortamın anahtarları, dışarıdan erişilebilir HTTPS callback ve gerekli veritabanı indeksleri tamamlanmalıdır. Ayrıntılar ve hazırlık kontrolü [ticaret rehberindedir](docs/commerce.md). Gerçek tahsilat/iade testi bu depodaki yerel testlerden ayrı bir işletim adımıdır.

## Doğrulama ve salt okunur katalog incelemesi

```sh
npm run verify:auth-navigation
npm run verify:commerce
# Kendi API kökünüzü açıkça belirtin:
npm run audit:commerce -- --api https://api.example.com --output /tmp/atlas-catalog-review.json
```

Auth yönlendirme kontrolü ağ kullanmaz. Ticaret kontrolü ayrı geçici MongoDB ve test sağlayıcısı kullanır; gerçek iyzico/banka çağrısı yapmaz. CI iş akışı bu kontroller ve derlemeler için [verify.yml](.github/workflows/verify.yml) dosyasında tanımlıdır; dosyanın bulunması son CI çalışmasının geçtiği iddiası değildir.

[Katalog inceleme betiği](scripts/audit-commerce-catalog.cjs) yalnız kamu paket/sınıf verisini okur; fiyat, sınıf veya ödeme değiştirmez. [30 Ekim 2026 raporu](docs/commerce-catalog-review.json) incelenen canlı katalogdaki sınıf eşleştirmesi eksiklerini tarihli olarak kaydeder. Rapor sonraki üretim durumunu veya yerel kodun yayımlandığını kanıtlamaz.

## Bilinen Sınırlamalar

- **Veli Paneli**: Bağlı öğrencilerin ödev ve sınav takibi vardır; müfredat/PDF için öğrenci seçimi gerekir.
- **Şifre İşlemleri**: Mevcut şifreyle hesap şifresi değiştirilebilir ve eski oturumlar iptal edilir. E-posta bağlantısıyla sıfırlama yok; şifresini unutan kullanıcı gerçek destek kanallarına yönlendirilir.
- **E-posta Doğrulama**: Henüz implemente edilmemiş
- **Dosya Yükleme**: Ödev ekleri ve özel ders videosu yüklemesi vardır; video dosyaları canlıda kalıcı disk gerektirir.
- **Bildirimler**: Push/e-posta bildirimi henüz yok
- **İade**: Panel yalnız yerel iade talebi kaydeder; banka/iyzico para iadesi yetkili personelce ayrıca yürütülür. Otomatik iade endpointi yoktur.
- **Faturalama**: Sipariş detayı mali fatura değildir; e-Fatura/e-Arşiv entegrasyonu yoktur.
- **Sepet**: Bir paket ve bir öğrenci içindir; çoklu ürün/adet ve kupon desteği yoktur.
- **Canlı Ödeme**: Yapılandırma kontrolü sağlayıcı onayı, gerçek sağlayıcı testi veya canlı dağıtım kanıtı değildir.
- **Kısmi Ders Paketleri**: LGS Sayısal/Sözel gibi ayrı tekliflerin ders yetkisi paket adından üretilmez; gerçek sınıf/ders ve gerektiğinde öğretmen atamalarının ayrıca kurulması gerekir. Kamu katalog raporu bu tekliflerin canlıda tamamen yapılandırıldığını kanıtlamaz; ayrıntılar [ticaret rehberindedir](docs/commerce.md).

## Güvenlik davranışları

Korumalı API istekleri yalnız token içindeki eski role güvenmez; aktif hesap, güncel rol ve `sessionVersion` veritabanından doğrulanır. Şifre değişimi eski oturumları geçersizleştirir. Üyelik/paket/sepet girdilerinde izin verilmeyen alanlar reddedilir; satın alma tutarı istemciden alınmaz. Süresi dolmuş, gelecekte başlayan, geri alınmış veya sandbox paket hakları canlı ders erişimi sağlamaz; bağımsız manuel kurum erişimi korunur. Ayrıntılı sınırlar ve doğrulama yöntemi ilgili mühendislik belgelerindedir.

Paket kaynaklı eğitim erişimi gerçek sınıf kimliğiyle sınırlandırılır; aynı `gradeLevel` paralel sınıfın içeriğini açmaz. Sınıf kimliği olmayan eski içerik, yetkili sınıfa bağlı aktif ders veya aynı sınıf/seviyedeki açık öğretmen atamasıyla ilişkilendirilmelidir. Yalnız bağımsız manuel/eski kurum kayıtlarının kendi seviyelerinde eski sınıfsız içerik uyumluluğu korunur. AtlasAI çalışma bağlamındaki ödev ve canlı ders bilgileri de bu sınıra tabidir; öğrencinin kendi tarihsel test sonuçlarının analizi ayrıca ele alınır. Ayrıntılı kurallar ve farklı LGS tekliflerinin yapılandırılması [ticaret rehberindedir](docs/commerce.md).

## Lisans

UNLICENSED — Özel proje
