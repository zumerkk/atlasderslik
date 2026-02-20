import api from '../api.js';
import { showToast, formatCurrency, getGradeLevelLabel } from '../utils.js';
import { state } from '../state.js';

export async function renderPackageDetailPage(params) {
  const app = document.getElementById('app');
  const packageId = params && params[0] ? params[0] : null;
  
  if (!packageId) {
    window.location.href = '/packages';
    return;
  }
  
  // Show loading
  app.innerHTML = `
    <div class="container py-4">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Paket yükleniyor...</p>
      </div>
    </div>
  `;

  try {
    const response = await api.getPackageById(packageId);
    const pkg = response.package;
    
    const price = pkg.final_price || pkg.price;
    const isLoggedIn = state.isAuthenticated;
    
    app.innerHTML = `
      <div class="container py-4">
        <div class="package-detail">
          <div class="package-detail-header">
            <div>
              <h1>${pkg.name}</h1>
              <div class="package-badges">
                ${pkg.is_popular ? '<span class="badge badge-primary">Popüler</span>' : ''}
                ${pkg.is_premium ? '<span class="badge badge-warning">Premium</span>' : ''}
                ${pkg.category ? `<span class="badge badge-secondary">${getCategoryLabel(pkg.category)}</span>` : ''}
              </div>
            </div>
            <div class="package-price-box">
              ${pkg.discount?.is_active ? `
                <div class="original-price">${formatCurrency(pkg.price)}</div>
                <div class="discount-badge">%${pkg.discount.percentage} İndirim</div>
              ` : ''}
              <div class="final-price">${formatCurrency(price)}</div>
              ${price >= 5000 ? '<div class="installment-text">9 taksit imkanı</div>' : '<div class="installment-text">Taksitsiz</div>'}
            </div>
          </div>

          <div class="package-detail-content">
            <div class="package-main">
              <section class="package-section">
                <h2>📝 Açıklama</h2>
                <p>${pkg.description}</p>
              </section>

              ${pkg.features && pkg.features.length > 0 ? `
                <section class="package-section">
                  <h2>✨ Özellikler</h2>
                  <ul class="features-list">
                    ${pkg.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
                  </ul>
                </section>
              ` : ''}

              <section class="package-section">
                <h2>📊 Detaylar</h2>
                <div class="details-grid">
                  <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <div>
                      <strong>Süre</strong>
                      <span>${pkg.duration_months} ay</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-book"></i>
                    <div>
                      <strong>Ders Sayısı</strong>
                      <span>${pkg.lesson_count} ders</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-layer-group"></i>
                    <div>
                      <strong>Seviye</strong>
                      <span>${getDifficultyLabel(pkg.difficulty_level)}</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <div>
                      <strong>Sınıf Seviyeleri</strong>
                      <span>${pkg.grade_levels?.map(g => getGradeLevelLabel(g)).join(', ') || 'Tüm seviyeler'}</span>
                    </div>
                  </div>
                </div>
              </section>

              ${pkg.subjects && pkg.subjects.length > 0 ? `
                <section class="package-section">
                  <h2>📚 Dersler</h2>
                  <div class="subjects-tags">
                    ${pkg.subjects.map(s => `<span class="tag">${s}</span>`).join('')}
                  </div>
                </section>
              ` : ''}
            </div>

            <div class="package-sidebar">
              <div class="purchase-card">
                <h3>Paketi Satın Al</h3>
                <div class="price-display">
                  ${pkg.discount?.is_active ? `
                    <div class="old-price">${formatCurrency(pkg.price)}</div>
                  ` : ''}
                  <div class="current-price">${formatCurrency(price)}</div>
                </div>
                
                ${price >= 5000 ? `
                  <div class="installment-info">
                    <i class="fas fa-credit-card"></i>
                    9 taksit imkanı
                  </div>
                ` : `
                  <div class="installment-info">
                    <i class="fas fa-info-circle"></i>
                    Sadece tek çekim
                  </div>
                `}

                ${isLoggedIn ? `
                  <a href="/payment/${pkg._id}" class="btn btn-primary btn-block btn-lg">
                    <i class="fas fa-shopping-cart"></i> Satın Al
                  </a>
                ` : `
                  <a href="/login" class="btn btn-primary btn-block btn-lg">
                    <i class="fas fa-sign-in-alt"></i> Giriş Yap
                  </a>
                `}

                <div class="security-info">
                  <i class="fas fa-shield-alt"></i>
                  Güvenli Ödeme
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Paket bilgileri yüklenirken hata oluştu', 'error');
    app.innerHTML = `
      <div class="container py-4">
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Paket bulunamadı</h3>
          <p>${error.message}</p>
          <a href="/packages" class="btn btn-primary">Paketlere Dön</a>
        </div>
      </div>
    `;
  }
}

function getCategoryLabel(category) {
  const labels = {
    'online-ders': 'Online Ders',
    'yaz-kampi': 'Yaz Kampı',
    'etut': 'Etüt'
  };
  return labels[category] || category;
}

function getDifficultyLabel(difficulty) {
  const labels = {
    'beginner': 'Başlangıç',
    'intermediate': 'Orta',
    'advanced': 'İleri'
  };
  return labels[difficulty] || difficulty;
}
