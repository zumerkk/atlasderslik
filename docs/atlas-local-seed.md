# Yerel deneme hesapları ve örnek veriler

`scripts/seed-local.cjs`, gerçek uygulamanın yerel MongoDB veritabanını doldurur. Sahte bir giriş servisi kullanmaz. Yalnızca `127.0.0.1`, `localhost` veya `::1` üzerindeki `atlas_local` veritabanına bağlanabilir; proje `.env` dosyasını ve `MONGO_URI` değerini okumaz.

Tüm uygulamayı (yerel veritabanı, API ve web) başlatmak için proje kökünde:

```sh
npm run local
```

Bu komut örnek verileri de hazırlar. Giriş adresi `http://localhost:3000/login` olur. Durumu görmek için `npm run local:status`, servisleri kapatmak için `npm run local:stop` kullanılır. Kapatmak verileri silmez; kayıtlar `.atlas-local/data` altında kalır. İlk kurulum MongoDB çalıştırıcısını indirir ve birkaç dakika sürebilir.

Yalnızca veri kurulumunu tekrar çalıştırmak için, MongoDB çalışırken:

```sh
node scripts/seed-local.cjs
```

Farklı bir yerel port için:

```sh
ATLAS_LOCAL_MONGO_URI=mongodb://127.0.0.1:27018/atlas_local node scripts/seed-local.cjs
```

İlk çalıştırmada dört hesabın her biri için ayrı ve rastgele bir parola oluşturulur:

| Rol | E-posta |
| --- | --- |
| Öğrenci | ogrenci@atlas.local |
| Veli | veli@atlas.local |
| Öğretmen | ogretmen@atlas.local |
| Admin | admin@atlas.local |

Parolalar yalnızca proje içindeki `.atlas-local/credentials.json` dosyasına yazılır. Komut klasör için `0700`, dosya için `0600` izni ister; POSIX izinlerini desteklemeyen harici disklerde etkin izin bağlama ayarına göre farklı görünebilir. Bu klasör sürüm kontrolünden hariç tutulur. Komut parolaları günlük çıktısına yazmaz. Dosyayı koruyun; yeniden çalıştırıldığında aynı hesap ve parolalar kullanılır. Mevcut hesabın parolası değişmişse komut bunu sıfırlamak yerine durur.

Deneme verisinde bir 6. sınıf, üç ders, veli-öğrenci bağlantısı, öğretmen atamaları, 36 soru, yedi test, altı test sonucu, üç ödev, iki teslim ve dört haftalık ders saati bulunur. İlk çalıştırma tarihine göre bu ayın ve önceki ayın örnek sonuçları oluşturulur. Kesirler, tekrar gerektiren bir alan; çarpanlar ve katlar ise daha güçlü bir alan olarak görünür. Türkçe testinin bu ayki puanı önceki aydan yüksektir. AtlasAI, bu kayıtları normal uygulama sorgularıyla analiz eder.

Veriler tamamen kurgusaldır ve yerel deneme içindir. Örnek canlı ders kaydı gerçek bir toplantı açmaz; örnek paket ve sipariş gerçek ödeme içermez. Komut tekrar çalıştırıldığında kayıtları silmez, mevcut çalışma veya ödev ilerlemesini değiştirmez. Zamanla tarihlerin eskimesi de bu koruma davranışının bir sonucudur.
