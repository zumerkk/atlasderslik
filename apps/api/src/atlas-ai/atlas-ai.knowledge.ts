// Curated from the role layouts and support screens. No personal data here.
// Update this guide when the corresponding product screens change.
export function atlasProductGuide(role: string): string {
  const common = [
    'Atlas Derslik öğrenci, veli, öğretmen ve yönetici panelleri olan eğitim platformudur.',
    'AtlasAI her panelin sol menüsünde ve sağ alt köşedeki maskotta açılır. Tam sayfada Sohbet, Gelişim, Çalışma planı ve PDF materyaller alanları bulunur. PDF materyaller yalnızca güncel onaylı kazanımlardan oluşturulur.',
    'Gelişim alanı sınav sonuçları, ödev teslimleri ve soruların konu eşleşmeleriyle hesaplanır. Ölçülmemiş ders çalışma süresini, izlenen video sayısını veya öğrenme düzeyini biliyormuş gibi konuşma.',
    'Çalışma planında günlük süre ve başlangıç saati seçilir; yedi günlük öneri oluşturulur. Plan ve tamamlandı işaretleri bu tarayıcı oturumuna kaydedilir. Takvime indir düğmesi .ics dosyası verir; takvim uygulamasına otomatik kayıt yapılmaz.',
    'Soru fotoğrafı PNG/JPEG/WebP ve en fazla 4 MB olabilir. Görsel oluştur modu öğrenmeyi destekleyen bir eğitim görseli üretir. Görsel çözümü ve üretimi OpenAI bağlantısı gerektirir.',
    'Sesli yanıt kullanıcı açarsa okunur; mikrofon desteği tarayıcıya bağlıdır. Şifremi unuttum işlemi okul yöneticisi üzerinden yürütülür.',
    'Sohbette istenen eylemi yapmış gibi konuşma. Verilmeyen kayıt durumlarını, canlı ders bağlantılarını, notları ve özellikleri uydurma.',
  ];
  const guides: Record<string, string[]> = {
    STUDENT: [
      'Derslerim kayıtlı dersleri; Ders Programım haftalık ders saatlerini; Canlı Dersler yaklaşan canlı dersleri gösterir.',
      'Konu Anlatımları ders videoları içindir. Ödevlerim ödev görüntüleme ve teslim ekranıdır. Sınavlarım test çözme ve sonuç ekranıdır.',
      'Paketlerim eğitim paketleri, Profilim hesap bilgileri, Destek okul ile iletişim içindir. Ders görünmüyorsa yöneticinin öğrenci sınıf/ders kaydını kontrol etmesi gerekir.',
    ],
    PARENT: [
      'Ana Sayfa hesabınıza bağlı öğrencileri gösterir. Ödev Takibi teslim durumunu, notları ve öğretmen geri bildirimini; Sınav Sonuçları sonuçları gösterir.',
      'Çocuk listede görünmüyorsa okul yöneticisi öğrenci hesabını veli hesabına bağlamalıdır. Birden fazla çocuk varsa analizde ilgili öğrenciyi seçin.',
      'Veli hesabı üzerinden öğrencinin yerine test çözme veya ödev teslim etme önerme. Profilim hesap bilgileri, Destek iletişim ve sık sorulan sorular içindir.',
    ],
    TEACHER: [
      'Sınıflarım atanan sınıfları; Ders Programım öğretmenin haftalık saatlerini gösterir. Canlı Derslerim canlı dersleri yönetir.',
      'Video Kütüphanesi video içerikleri; Ödevler ödev hazırlama ve değerlendirme; Soru Bankası soru içerikleri; Testler test hazırlama alanlarıdır.',
      'Öğrenci analizinde yalnızca öğretmene atanmış sınıf ve dersler kapsamındaki veriler kullanılabilir. Eksik sınıf/ders atamasını yönetici Öğretmen Atamaları ekranından kontrol eder.',
    ],
    ADMIN: [
      'Kullanıcılar öğrenci, veli ve öğretmen hesapları içindir. Öğrenci Kayıtları sınıf kaydı; Öğretmen Atamaları öğretmen, sınıf ve ders eşleşmesi içindir.',
      'Müfredat düzeni Sınıflar → Dersler → Üniteler → Konular şeklindedir. Soru konu eşleşmesi yoksa AtlasAI o sorudan güvenilir konu eksiği çıkaramaz.',
      'Ders Programı haftalık ders saatleri içindir. Paketler paket tanımları, Siparişler sipariş görünümü içindir. Sohbette ödeme veya kayıt değiştirme yapılmaz.',
      'OpenAI anahtarı web paneline yazılmaz; API sunucusunda OPENAI_API_KEY ayarlanır. Metin modeli OPENAI_MODEL, görsel modeli OPENAI_IMAGE_MODEL ile seçilir. Gelişim ölçümleri anahtarsız çalışır; çalışma planı için güncel müfredat onayı gerekir. Eğitim içeriği, PDF ve video özeti için OpenAI bağlantısı zorunludur. Müfredat onayı admin Konular ekranından yapılır.',
    ],
  };
  return [...common, ...(guides[role === 'SUPERADMIN' ? 'ADMIN' : role] || [])].join('\n');
}
