// Packages Page
import api from '../api.js';
import {
  formatCurrency,
  getCategoryLabel,
  getDifficultyLabel,
  getGradeLevelLabel,
  showToast,
} from '../utils.js';
import router from '../router.js';

export async function renderPackagesPage(params = [], query = {}) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="packages-header">
      <div class="container">
        <h1>Eğitim Paketleri</h1>
        <p>Size en uygun eğitim paketini seçin ve başarıya adım atın</p>
      </div>
    </div>

    <div class="container py-4">
      <!-- Filters -->
      <div class="packages-filters">
        <select class="form-select" id="category-filter">
          <option value="">Tüm Kategoriler</option>
          <option value="online-ders">Online Dersler</option>
          <option value="yaz-kampi">Yaz Kampları</option>
          <option value="etut">Etüt Hizmetleri</option>
        </select>

        <select class="form-select" id="grade-filter">
          <option value="">Tüm Sınıflar</option>
          <option value="4">4. Sınıf</option>
          <option value="5">5. Sınıf</option>
          <option value="6">6. Sınıf</option>
          <option value="7">7. Sınıf</option>
          <option value="8">8. Sınıf (LGS)</option>
        </select>

        <select class="form-select" id="difficulty-filter">
          <option value="">Tüm Seviyeler</option>
          <option value="beginner">Başlangıç</option>
          <option value="intermediate">Orta</option>
          <option value="advanced">İleri</option>
        </select>

        <button class="btn btn-primary" id="apply-filters">
          <i class="fas fa-filter"></i>
          Filtrele
        </button>
      </div>

      <!-- Loading -->
      <div id="packages-loading" class="text-center py-4" style="display: none;">
        <div class="spinner" style="margin: 0 auto;"></div>
        <p class="mt-2">Paketler yükleniyor...</p>
      </div>

      <!-- Packages Grid -->
      <div class="grid grid-cols-3" id="packages-grid"></div>

      <!-- Empty State -->
      <div id="packages-empty" class="text-center py-4" style="display: none;">
        <i class="fas fa-inbox" style="font-size: 4rem; color: var(--gray-300);"></i>
        <h3>Paket Bulunamadı</h3>
        <p class="text-muted">Seçtiğiniz filtrelere uygun paket bulunamadı.</p>
      </div>
    </div>
  `;

  const initialFilters = sanitizeFilters(query);

  // Pre-select filters based on query
  const categoryFilter = document.getElementById('category-filter');
  const gradeFilter = document.getElementById('grade-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');

  if (initialFilters.category) categoryFilter.value = initialFilters.category;
  if (initialFilters.grade_level) gradeFilter.value = initialFilters.grade_level;
  if (initialFilters.difficulty_level) difficultyFilter.value = initialFilters.difficulty_level;

  // Load packages
  await loadPackages(initialFilters);

  // Setup filters
  setupFilters();
}

async function loadPackages(filters = {}) {
  const loading = document.getElementById('packages-loading');
  const grid = document.getElementById('packages-grid');
  const empty = document.getElementById('packages-empty');

  loading.style.display = 'block';
  grid.innerHTML = '';
  empty.style.display = 'none';

  try {
    const response = await api.getPackages(filters);
    const packages = response.packages || [];

    loading.style.display = 'none';

    if (packages.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = packages
      .map(
        (pkg) => `
      <div class="card package-card">
        ${
          pkg.is_popular
            ? '<div class="package-badge"><span class="badge badge-primary">Popüler</span></div>'
            : ''
        }
        ${
          pkg.is_premium
            ? '<div class="package-badge" style="top: 3.5rem;"><span class="badge badge-secondary">Premium</span></div>'
            : ''
        }
        
        <div class="card-body">
          <h3 class="card-title">${pkg.name}</h3>
          
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <span class="badge badge-secondary">
              <i class="fas fa-tag"></i>
              ${getCategoryLabel(pkg.category)}
            </span>
            ${
              pkg.difficulty_level
                ? `
              <span class="badge badge-secondary">
                ${getDifficultyLabel(pkg.difficulty_level)}
              </span>
            `
                : ''
            }
            ${
              pkg.grade_levels && pkg.grade_levels.length > 0
                ? `
              <span class="badge badge-secondary">
                ${pkg.grade_levels.map((g) => getGradeLevelLabel(g)).join(', ')}
              </span>
            `
                : ''
            }
          </div>

          <p class="card-text">${pkg.description.substring(0, 120)}...</p>

          <div class="package-price">
            ${
              pkg.discount?.is_active && pkg.discount.percentage > 0
                ? `
              <span class="package-price-old">${formatCurrency(pkg.price)}</span>
              <span class="badge badge-danger">%${pkg.discount.percentage} İNDİRİM</span>
            `
                : ''
            }
            <div>${formatCurrency(pkg.final_price)}</div>
          </div>

          <ul class="package-features">
            ${pkg.lesson_count ? `<li>${pkg.lesson_count} Ders</li>` : ''}
            <li>${pkg.duration_months} Ay Süre</li>
            ${pkg.subjects && pkg.subjects.length > 0 ? `<li>${pkg.subjects.join(', ')}</li>` : ''}
            ${pkg.features ? pkg.features.slice(0, 2).map((f) => `<li>${f}</li>`).join('') : ''}
          </ul>
        </div>

        <div class="card-footer">
          <a href="/packages/${pkg._id}" class="btn btn-primary btn-block">
            <i class="fas fa-shopping-cart"></i>
            Detayları Gör
          </a>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    loading.style.display = 'none';
    showToast('Paketler yüklenirken hata oluştu', 'error');
    console.error('Error loading packages:', error);
  }
}

function setupFilters() {
  const applyBtn = document.getElementById('apply-filters');
  const categoryFilter = document.getElementById('category-filter');
  const gradeFilter = document.getElementById('grade-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');

  applyBtn.addEventListener('click', () => {
    const filters = {};

    if (categoryFilter.value) filters.category = categoryFilter.value;
    if (gradeFilter.value) filters.grade_level = gradeFilter.value;
    if (difficultyFilter.value) filters.difficulty_level = difficultyFilter.value;

    const queryString = new URLSearchParams(filters).toString();
    if (queryString) {
      router.navigate(`/packages?${queryString}`);
    } else {
      router.navigate('/packages');
    }
  });
}

function sanitizeFilters(filters = {}) {
  const sanitized = {};

  if (filters.category) sanitized.category = filters.category;
  if (filters.grade_level) sanitized.grade_level = filters.grade_level;
  if (filters.difficulty_level) sanitized.difficulty_level = filters.difficulty_level;

  return sanitized;
}

