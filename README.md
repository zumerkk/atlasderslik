# Atlas Derslik — Eğitimin Dijital Atlası

Ortaokul öğrencileri için yeni nesil online eğitim platformu. Canlı dersler, video kütüphanesi, ödev takibi ve gelişim raporları ile kapsamlı eğitim hizmeti.

## Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, TailwindCSS 4, Radix UI, shadcn/ui |
| Backend | NestJS 11, Mongoose, JWT Auth |
| Veritabanı | MongoDB |
| Monorepo | Turborepo, pnpm |

## Gereksinimler

- Node.js ≥ 18
- pnpm ≥ 10
- MongoDB (lokal veya Atlas)

## Kurulum

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. Backend env dosyasını oluştur
cp apps/api/.env.example apps/api/.env
# .env içindeki MONGO_URI ve JWT_SECRET değerlerini düzenle

# 3. Frontend env dosyasını oluştur
cp apps/web/.env.example apps/web/.env.local

# 4. Veritabanını seed'le (tüm demo verileri)
cd apps/api && npm run seed && cd ../..

# 5. Geliştirme sunucusunu başlat
pnpm dev
```

## Çalıştırma

| Servis | Port | Komut |
|--------|------|-------|
| Frontend | 3000 | `pnpm --filter web dev` |
| Backend | 3001 | `pnpm --filter api start:dev` |
| Tümü | — | `pnpm dev` |

## Test Kullanıcıları

Seed çalıştırıldığında aşağıdaki kullanıcılar oluşturulur (tüm şifreler: `Password123!`):

| Rol | Email | Açıklama |
|-----|-------|----------|
| Admin | admin@atlas.com | Tam yetki |
| Öğretmen | teacher1@atlas.com | Ayşe Yılmaz — 5.Mat, 5.Fen, 6.Mat |
| Öğretmen | teacher2@atlas.com | Mehmet Kaya — 6.Türkçe, 7.Mat, 7.Fen |
| Öğrenci | student1@atlas.com .. student10@atlas.com | 5-7. sınıf |
| Veli | parent1@atlas.com .. parent3@atlas.com | Öğrenci velileri |

Seed ayrıca şunları oluşturur: 3 sınıf, 12 ders, 24 ünite, 72 konu, 6 öğretmen ataması, 10 öğrenci kaydı, 4 paket, 2 canlı ders, 3 video, 3 ödev, 10 soru.

## Proje Yapısı

```
atlas-derslik-monorepo/
├── apps/
│   ├── api/          # NestJS Backend (Port 3001)
│   │   ├── src/
│   │   │   ├── auth/           # JWT Auth, Guards, Strategies
│   │   │   ├── education/      # Grades, Subjects, Units, Topics, Videos, Assignments
│   │   │   ├── packages/       # Eğitim Paketleri & Siparişler
│   │   │   ├── users/          # Kullanıcı Yönetimi
│   │   │   └── statistics/     # Dashboard İstatistikleri
│   │   └── .env
│   └── web/          # Next.js Frontend (Port 3000)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (admin)/    # Admin Paneli
│       │   │   ├── (teacher)/  # Öğretmen Paneli
│       │   │   ├── (student)/  # Öğrenci Paneli
│       │   │   ├── (parent)/   # Veli Paneli
│       │   │   ├── login/      # Giriş Sayfası
│       │   │   └── register/   # Kayıt Sayfası
│       │   ├── components/     # UI Bileşenleri
│       │   └── lib/            # Yardımcı Fonksiyonlar
│       └── .env.local
└── packages/
    ├── shared/       # Ortak tipler (UserRole enum)
    └── ui/           # Ortak UI bileşenleri
```

## Build

```bash
pnpm build
```

## Ortam Değişkenleri

### Backend (`apps/api/.env`)

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| MONGO_URI | MongoDB bağlantı adresi | mongodb://localhost:27017/atlas-derslik |
| JWT_SECRET | JWT token imzalama anahtarı | (güçlü bir anahtar belirleyin) |
| PORT | API sunucu portu | 3001 |

### Frontend (`apps/web/.env.local`)

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| NEXT_PUBLIC_API_URL | Backend API adresi | http://localhost:3001 |
