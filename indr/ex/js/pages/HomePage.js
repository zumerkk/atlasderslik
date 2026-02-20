// Home Page
import api from '../api.js';
import { formatCurrency, getCategoryLabel, showToast } from '../utils.js';

export async function renderHomePage() {
  const app = document.getElementById('app');

  try {
    // Get featured packages
    const packagesResponse = await api.getPackages({ is_popular: true });
    const packages = packagesResponse.packages || [];

    app.innerHTML = `
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <h1>🎓 Derslerde Kaybolma, Atlas Derslik Yanında!</h1>
          <p>Ortaokul müfredatına ve LGS'ye yönelik haftalık canlı grup derslerimizde, öğrencilerin motivasyonu ve başarısı için her bir derslerimizde aktif katılımını sağlayarak, dersleri sevdiriyor, her bir öğrencinin potansiyelini keşfetmesine olanak tanıyoruz. Modern ve interaktif platformumuzda, deneyimli öğretmenlerimizle dersleri sevdiriyor, her bir öğrencinin potansiyelini keşfetmesine olanak tanıyoruz. Atlas Derslik ile öğrenmek artık çok daha etkili ve keyifli.</p>
          <div class="hero-buttons">
            <a href="/packages" class="btn btn-primary btn-lg">
              <i class="fas fa-book"></i>
              Paketleri İncele
            </a>
            <a href="/register" class="btn btn-outline btn-lg" style="color: white; border-color: white;">
              <i class="fas fa-user-plus"></i>
              Hemen Başla
            </a>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features">
        <div class="container">
          <h2 class="text-center">Neden Atlas Derslik?</h2>
          <p class="text-center text-muted">Başarınız için en iyi eğitim hizmetini sunuyoruz</p>

          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-chalkboard-teacher"></i>
              </div>
              <h3>Uzman Öğretmenler</h3>
              <p>Alanında uzman, deneyimli öğretmenlerle etkili öğrenme</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-laptop"></i>
              </div>
              <h3>Online Eğitim</h3>
              <p>İstediğiniz zaman, istediğiniz yerden kaliteli eğitime erişim</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <h3>Kişisel Takip</h3>
              <p>Gelişiminizi takip edin, hedeflerinize adım adım ilerleyin</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-certificate"></i>
              </div>
              <h3>Sertifikalı Program</h3>
              <p>Tamamladığınız programlar için geçerli sertifikalar</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Popular Packages Section -->
      <section class="py-4" style="background: var(--gray-50);">
        <div class="container">
          <h2 class="text-center">Popüler Paketler</h2>
          <p class="text-center text-muted mb-4">En çok tercih edilen eğitim paketlerimiz</p>

          <div class="grid grid-cols-3" id="popular-packages">
            ${
              packages.length > 0
                ? packages
                    .slice(0, 3)
                    .map(
                      (pkg) => `
              <div class="card">
                ${
                  pkg.is_popular
                    ? '<div class="package-badge"><span class="badge badge-primary">Popüler</span></div>'
                    : ''
                }
                <div class="card-body">
                  <h3 class="card-title">${pkg.name}</h3>
                  <p class="text-muted">
                    <i class="fas fa-tag"></i>
                    ${getCategoryLabel(pkg.category)}
                  </p>
                  <p class="card-text">${pkg.description.substring(0, 100)}...</p>
                  
                  <div class="package-price">
                    ${
                      pkg.discount?.is_active
                        ? `
                      <span class="package-price-old">${formatCurrency(pkg.price)}</span>
                    `
                        : ''
                    }
                    ${formatCurrency(pkg.final_price)}
                  </div>

                  <ul class="package-features">
                    <li>${pkg.lesson_count} Ders</li>
                    <li>${pkg.duration_months} Ay Süre</li>
                    <li>Sınırsız Soru-Cevap</li>
                  </ul>
                </div>
                <div class="card-footer">
                  <a href="/packages/${pkg._id}" class="btn btn-primary btn-block">
                    Detayları Gör
                  </a>
                </div>
              </div>
            `
                    )
                    .join('')
                : '<p class="text-center">Henüz paket bulunmuyor.</p>'
            }
          </div>

          <div class="text-center mt-4">
            <a href="/packages" class="btn btn-primary btn-lg">
              Tüm Paketleri Görüntüle
            </a>
          </div>
        </div>
      </section>


      <!-- CTA Section -->
      <section class="py-4">
        <div class="container text-center">
          <h2>Hemen Başlayın!</h2>
          <p class="text-muted mb-4">Size en uygun paketi seçin ve başarıya adım atın</p>
          <a href="/register" class="btn btn-primary btn-lg">
            <i class="fas fa-rocket"></i>
            Ücretsiz Kayıt Ol
          </a>
        </div>
      </section>
    `;
  } catch (error) {
    console.error('Error rendering home page:', error);
    app.innerHTML = `
      <div class="container py-4">
        <div class="card">
          <div class="card-body text-center">
            <h2>Bir Hata Oluştu</h2>
            <p>Sayfa yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
          </div>
        </div>
      </div>
    `;
  }
}

