export async function renderAboutPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="about-page">
      <!-- Hero Section -->
      <section class="about-hero">
        <div class="container">
          <h1>Atlas Derslik Hakkında</h1>
          <p>Eğitimde dijital dönüşümün öncüsü olarak, her öğrencinin potansiyelini keşfetmesi için yenilikçi çözümler sunuyoruz.</p>
        </div>
      </section>

      <!-- Mission & Vision -->
      <section class="py-5">
        <div class="container">
          <div class="row">
            <div class="col-md-6 mb-4">
              <div class="mission-card">
                <div class="icon-box" style="background: #4361ee; color: white;">
                  <i class="fas fa-bullseye"></i>
                </div>
                <h2>Misyonumuz</h2>
                <p>Atatürk'ün "Bilim ve fen nerede ise oradan alacağız ve ulusun her bireyin kafasına koyacağız. Bilim ve fen için bağ ve koşul yoktur." sözünü kendine rehber edinen Atlas Derslik olarak; gençlerimizi ezberciliğe değil, uzak, eleştirel düşünmeye, araştıran, sorgulayan ve ülkesine değer katma azmiyle dolu bireyler olarak yetişmeleri için destek olmak. Onlara, en kaliteli eğitimi en erişilebilir şekilde sunarak, akademik başarılarının yanı sıra özgüvenli, araştıran ve ülkesine değer katma azmiyle dolu bireyler olarak yetişmeleri için destek olmak.</p>
              </div>
            </div>
            <div class="col-md-6 mb-4">
              <div class="mission-card">
                <div class="icon-box" style="background: #f72585; color: white;">
                  <i class="fas fa-eye"></i>
                </div>
                <h2>Vizyonumuz</h2>
                <p>Atatürk'ün işaret ettiği muasır medeniyet seviyesine, eğitimde fırsat eşitliği sağlayarak ve her bir gencimizi en iyi versiyonu olmaya teşvik ederek ulaşılmasına önculuk etmek. Türkiye'nin dört bir yanındaki gençlerin potansiyelini ortaya çıkarmak ve onları geleceğin aydınlık liderleri olarak hazırlamak, Atlas Derslik ile açığa çıkarmak ve onları geleceğin aydınlık liderleri olarak hazırlamak.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Values Section -->
      <section class="values-section py-5" style="background: #f8f9fa;">
        <div class="container">
          <h2 class="text-center mb-5">Değerlerimiz</h2>
          <p class="text-center mb-4">Çalışmalarımızı yönlendiren temel değerlerimiz.</p>
          
          <div class="values-grid">
            <div class="value-card">
              <div class="value-icon">
                <i class="fas fa-bullseye"></i>
              </div>
              <h3>Hedef Odaklılık</h3>
              <p>Her öğrencinin hedeflerine ulaşması için kişiselleştirilmiş çözümler sunuyoruz.</p>
            </div>

            <div class="value-card">
              <div class="value-icon">
                <i class="fas fa-heart"></i>
              </div>
              <h3>Öğrenci Odaklılık</h3>
              <p>Öğrencilerimizin başarısı bizim en büyük motivasyon kaynağımızdır.</p>
            </div>

            <div class="value-card">
              <div class="value-icon">
                <i class="fas fa-lightbulb"></i>
              </div>
              <h3>İnovasyon</h3>
              <p>Eğitimde yenilikçi teknolojiler ve yöntemler kullanarak fark yaratıyoruz.</p>
            </div>

            <div class="value-card">
              <div class="value-icon">
                <i class="fas fa-certificate"></i>
              </div>
              <h3>Kalite</h3>
              <p>En yüksek kalite standartlarında eğitim içeriği ve hizmet sunuyoruz.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Atlas Derslik -->
      <section class="py-5">
        <div class="container">
          <h2 class="text-center mb-4">Neden Atlas Derslik?</h2>
          <p class="text-center mb-5">Çünkü derslerde kaybolduğunu hissettiğin o anlarda yanında olacak bir yol arkadaşı arıyorsan, doğru yerdesin!</p>
          
          <div class="why-atlas">
            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-users"></i>
              </div>
              <h3>Canlı ve İnteraktif Grup Dersleri</h3>
              <p>Sıkıcı video izleme dönemleri sona erdiyor, gerçek bir sınıf deneyimi eviniz taşıyoruz.</p>
            </div>

            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-user-tie"></i>
              </div>
              <h3>Uzman Öğretmenler Eşliğinde Öğrenme</h3>
              <p>Anlamadığın her soruyu anında sorma, akranlarınla birlikte öğrenme fırsatını buluyorsun.</p>
            </div>

            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <h3>Ekonomik ve Erişilebilir Sistem</h3>
              <p>Kaliteli eğitimi herkes için ulaşabilir kılıyoruz.</p>
            </div>

            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-clock"></i>
              </div>
              <h3>Düzenli ve Disiplinli Çalışma</h3>
              <p>Planlı ders programları ve motive edici bir topluluk sunuyoruz.</p>
            </div>

            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <h3>Hızlı Eksik Tespiti</h3>
              <p>Eksiklerini hızlıca tespit edip grup dinamiğiyle tamamlama imkânı sağlıyoruz.</p>
            </div>

            <div class="why-item">
              <div class="why-icon">
                <i class="fas fa-trophy"></i>
              </div>
              <h3>Özgüven Artırıcı Yaklaşım</h3>
              <p>Bilginin karmaşık yollarını birlikte aşmayı vaat ediyoruz.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section py-5" style="background: #4361ee; color: white;">
        <div class="container text-center">
          <h2>Bizimle Öğrenmeye Başlayın</h2>
          <p>Deneyimli ekibimiz ve yenilikçi platformumuzla öğrenme yolculuğunuza bugün başlayın.</p>
          <div style="margin-top: 2rem;">
            <a href="/register" class="btn" style="background: white; color: #4361ee; padding: 1rem 2rem; margin: 0 0.5rem;">
              Hemen Başla →
            </a>
            <a href="/contact" class="btn" style="background: transparent; color: white; border: 2px solid white; padding: 1rem 2rem; margin: 0 0.5rem;">
              İletişime Geçin
            </a>
          </div>
        </div>
      </section>
    </div>
  `;
}
