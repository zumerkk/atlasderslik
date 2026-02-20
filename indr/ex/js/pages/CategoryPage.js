import api from '../api.js';
import {
  formatCurrency,
  getCategoryLabel,
  getDifficultyLabel,
  getGradeLevelLabel,
  showToast
} from '../utils.js';

const CATEGORY_CONTENT = {
  'online-ders': {
    title: 'Online Dersler',
    description:
      'Atlas Derslik canlı ve etkileşimli online derslerle öğrencilerinizi uzman öğretmenler eşliğinde başarıya taşır. Haftalık programlarla tüm derslerde eksiksiz destek sunuyoruz.',
    benefits: [
      'Canlı ve etkileşimli ders ortamı',
      'Uzman öğretmen kadrosu',
      'Düzenli ödev ve takip sistemi',
      'Kişiselleştirilmiş gelişim raporları'
    ]
  },
  'yaz-kampi': {
    title: 'Yaz Kampları',
    description:
      'Yoğunlaştırılmış yaz kamplarımız ile öğrencilerinizi yeni döneme hazırlayın. Akademik tekrar, motivasyon ve hedef odaklı çalışma ile tatili verimli geçirin.',
    benefits: [
      'Yoğunlaştırılmış ders programı',
      'Motivasyon ve rehberlik desteği',
      'Sınav odaklı tekrarlar',
      'Aktif soru-cevap oturumları'
    ]
  },
  etut: {
    title: 'Etüt Hizmetleri',
    description:
      'Birebir takip ve eksik tamamlama odaklı etüt programlarımız ile öğrencilerinizin ihtiyaç duyduğu noktalarda destek sağlıyoruz.',
    benefits: [
      'Birebir eksik tamamlama',
      'Öğrenciye özel çalışma planı',
      'Soru çözüm seansları',
      'Veli bilgilendirme sistemi'
    ]
  }
};

export async function renderCategoryPage(params = []) {
  const app = document.getElementById('app');
  const categoryKey = params && params[0] ? params[0] : null;

  if (!categoryKey || !CATEGORY_CONTENT[categoryKey]) {
    window.location.href = '/packages';
    return;
  }

  const content = CATEGORY_CONTENT[categoryKey];

  app.innerHTML = `
    <div class="category-page">
      <section class="category-hero">
        <div class="container text-center">
          <h1>${content.title}</h1>
          <p>${content.description}</p>
          <div class="category-tags">
            <span class="tag">Güvenilir Eğitim</span>
            <span class="tag">Uzman Öğretmenler</span>
            <span class="tag">Canlı Dersler</span>
          </div>
          <div class="category-cta">
            <a href="/packages?category=${categoryKey}" class="btn btn-primary">Tüm Paketleri Gör</a>
            <a href="/contact" class="btn btn-secondary">Danışman ile Görüş</a>
          </div>
        </div>
      </section>

      <section class="py-5">
        <div class="container">
          <div class="category-benefits">
            ${content.benefits
              .map(
                (benefit) => `
              <div class="benefit-card">
                <i class="fas fa-check-circle"></i>
                <p>${benefit}</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>

      <section class="py-5" id="category-packages">
        <div class="container">
          <h2 class="text-center mb-4">Öne Çıkan Paketler</h2>
          <div class="grid grid-cols-3" id="category-packages-grid"></div>
          <div id="category-packages-empty" class="text-center py-4" style="display:none;">
            <i class="fas fa-inbox" style="font-size: 4rem; color: var(--gray-300);"></i>
            <h3>Paket Bulunamadı</h3>
            <p class="text-muted">Bu kategori için şu an paket bulunmuyor.</p>
          </div>
        </div>
      </section>
    </div>
  `;

  await loadCategoryPackages(categoryKey);
}

async function loadCategoryPackages(category) {
  const grid = document.getElementById('category-packages-grid');
  const emptyState = document.getElementById('category-packages-empty');

  if (!grid) return;

  grid.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

  try {
    const response = await api.getPackages({ category });
    const packages = response.packages || [];

    if (packages.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = packages
      .map((pkg) => renderPackageCard(pkg))
      .join('');
  } catch (error) {
    showToast('Paketler yüklenirken hata oluştu', 'error');
    grid.innerHTML = '';
    emptyState.style.display = 'block';
  }
}

function renderPackageCard(pkg) {
  return `
    <div class="card package-card">
      ${
        pkg.is_popular
          ? '<div class="package-badge"><span class="badge badge-primary">Popüler</span></div>'
          : ''
      }
      <div class="card-body">
        <h3 class="card-title">${pkg.name}</h3>
        <p class="card-text">${pkg.description.substring(0, 140)}...</p>
        <div class="package-price">
          <div>${formatCurrency(pkg.final_price)}</div>
        </div>
        <div class="package-meta">
          <span class="badge badge-secondary">${getCategoryLabel(pkg.category)}</span>
          ${
            pkg.difficulty_level
              ? `<span class="badge badge-secondary">${getDifficultyLabel(pkg.difficulty_level)}</span>`
              : ''
          }
          ${
            pkg.grade_levels?.length
              ? `<span class="badge badge-secondary">${pkg.grade_levels
                  .map((g) => getGradeLevelLabel(g))
                  .join(', ')}</span>`
              : ''
          }
        </div>
      </div>
      <div class="card-footer">
        <a href="/packages/${pkg._id}" class="btn btn-primary btn-block">Detayları Gör</a>
      </div>
    </div>
  `;
}


