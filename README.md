# Atlas Derslik — Online Eğitim Platformu

Atlas Derslik, ortaokul (5–8. sınıf) ve LGS hazırlık sürecine yönelik kapsamlı bir online eğitim platformudur. Öğretmen, öğrenci, veli ve admin rollerini destekler.

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

- **Node.js** ≥ 18
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
| `PARENT`  | Öğrenci takibi (geliştirme aşamasında)        |

## Deploy (Render.com)

Proje `render.yaml` üzerinden Blueprint olarak deploy edilir:
1. Render Dashboard → **Blueprint** → GitHub repo bağla
2. `MONGO_URI` ve `JWT_SECRET` ortam değişkenlerini ayarla
3. Web servisi için `NEXT_PUBLIC_API_URL`'yi API servisinin URL'si olarak ayarla

## Bilinen Sınırlamalar

- **Veli Paneli**: Şu an placeholder durumunda, aktif geliştirme sürecinde
- **Şifre Sıfırlama**: Self-servis şifre sıfırlama yok; admin üzerinden yapılır
- **E-posta Doğrulama**: Henüz implemente edilmemiş
- **Dosya Yükleme**: Henüz yok; ödev teslimi metin tabanlı
- **Bildirimler**: Push/e-posta bildirimi henüz yok

## Son Değişiklikler (Audit — Mart 2026)

### Güvenlik Düzeltmeleri
- ✅ Register endpoint'inde ADMIN rol yükseltme açığı kapatıldı
- ✅ Brute-force koruması eklendi (rate limiting)
- ✅ Helmet güvenlik başlıkları eklendi
- ✅ Hardcoded Iyzico sandbox anahtarları kaldırıldı
- ✅ Kullanıcı güncelleme endpoint'inde mass-assignment koruması
- ✅ Frontend JWT token süre kontrolü eklendi
- ✅ Global exception filter ile standart hata formatı

### İyileştirmeler
- ✅ JWT süresi 60dk → 7 gün olarak uzatıldı
- ✅ Health endpoint'e MongoDB durumu eklendi
- ✅ "Şifremi Unuttum" butonu bilgilendirme mesajı gösteriyor
- ✅ Register sayfasında şifre minimum 8 karakter
- ✅ API 401 handler düzeltildi
- ✅ Education service'de uygun NestJS exceptions

## Lisans

UNLICENSED — Özel proje
