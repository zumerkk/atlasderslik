// Student Packages Page
import api from '../../api.js';
import auth from '../../auth.js';
import { formatDate, formatCurrency, showToast } from '../../utils.js';
import router from '../../router.js';

export async function renderStudentPackagesPage() {
  if (!auth.requireRole('student')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container py-4">
      <div class="dashboard-header">
        <div>
          <h1>Paketlerim</h1>
          <p class="text-muted">Aktif ve geçmiş eğitim paketleriniz</p>
        </div>
        <a href="/packages" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          Yeni Paket Al
        </a>
      </div>

      <!-- Loading -->
      <div id="packages-loading" class="text-center py-4">
        <div class="spinner" style="margin: 0 auto;"></div>
        <p class="mt-2">Paketler yükleniyor...</p>
      </div>

      <!-- Tabs -->
      <div id="packages-tabs" class="tabs" style="display: none;">
        <button class="tab-btn active" data-tab="active">
          <i class="fas fa-play-circle"></i>
          Aktif Paketler
        </button>
        <button class="tab-btn" data-tab="expired">
          <i class="fas fa-clock"></i>
          Geçmiş Paketler
        </button>
        <button class="tab-btn" data-tab="pending">
          <i class="fas fa-hourglass-half"></i>
          Bekleyen Ödemeler
        </button>
      </div>

      <!-- Content -->
      <div id="packages-content" style="display: none;">
        <!-- Active Packages -->
        <div id="active-packages" class="tab-content active"></div>

        <!-- Expired Packages -->
        <div id="expired-packages" class="tab-content" style="display: none;"></div>

        <!-- Pending Payments -->
        <div id="pending-packages" class="tab-content" style="display: none;"></div>
      </div>
    </div>
  `;

  // Load packages
  await loadStudentPackages();

  // Setup tab switching
  setupTabs();
}

async function loadStudentPackages() {
  const loading = document.getElementById('packages-loading');
  const tabs = document.getElementById('packages-tabs');
  const content = document.getElementById('packages-content');

  try {
    const response = await api.getMyPackages();
    const packages = response.packages || [];

    loading.style.display = 'none';
    tabs.style.display = 'flex';
    content.style.display = 'block';

    // Separate packages by status
    const activePackages = packages.filter(pkg => pkg.status === 'active');
    const expiredPackages = packages.filter(pkg => pkg.status === 'expired');
    const pendingPackages = packages.filter(pkg => pkg.status === 'pending');

    // Render each category
    renderActivePackages(activePackages);
    renderExpiredPackages(expiredPackages);
    renderPendingPackages(pendingPackages);

    // Update tab counts
    updateTabCounts(activePackages.length, expiredPackages.length, pendingPackages.length);
  } catch (error) {
    loading.style.display = 'none';
    showToast('Paketler yüklenirken hata oluştu', 'error');
    console.error('Error loading packages:', error);
  }
}

function renderActivePackages(packages) {
  const container = document.getElementById('active-packages');

  if (packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Aktif Paketiniz Bulunmuyor</h3>
        <p>Hemen bir paket alarak eğitiminize başlayabilirsiniz.</p>
        <a href="/packages" class="btn btn-primary">
          <i class="fas fa-shopping-cart"></i>
          Paketlere Göz At
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = packages.map(pkg => `
    <div class="card package-card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3>${pkg.package_id.name}</h3>
            <p class="text-muted">${pkg.package_id.description}</p>
          </div>
          <span class="badge badge-success">Aktif</span>
        </div>

        <div class="package-details">
          <div class="detail-item">
            <i class="fas fa-calendar-alt"></i>
            <span>
              <strong>Başlangıç:</strong> ${formatDate(pkg.start_date)}
            </span>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar-check"></i>
            <span>
              <strong>Bitiş:</strong> ${formatDate(pkg.end_date)}
            </span>
          </div>
          <div class="detail-item">
            <i class="fas fa-book"></i>
            <span>
              <strong>Ders Sayısı:</strong> ${pkg.package_id.lesson_count || 0}
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        ${pkg.progress ? `
          <div class="progress-section mt-3">
            <div class="d-flex justify-content-between mb-1">
              <span>İlerleme</span>
              <span>${pkg.progress.completion_percentage || 0}%</span>
            </div>
            <div class="progress">
              <div class="progress-bar" style="width: ${pkg.progress.completion_percentage || 0}%"></div>
            </div>
            <small class="text-muted">
              ${pkg.progress.completed_lessons || 0} / ${pkg.progress.total_lessons || 0} ders tamamlandı
            </small>
          </div>
        ` : ''}

        <!-- Payment Info -->
        <div class="payment-info mt-3">
          <div class="d-flex justify-content-between">
            <span>Ödenen Tutar:</span>
            <strong>${formatCurrency(pkg.payment_id?.amount || 0)}</strong>
          </div>
          ${pkg.payment_id?.installment > 1 ? `
            <small class="text-muted">
              ${pkg.payment_id.installment} taksit ile ödendi
            </small>
          ` : ''}
        </div>

        <!-- Actions -->
        <div class="package-actions mt-3">
          <button class="btn btn-sm btn-primary" onclick="viewPackageDetails('${pkg._id}')">
            <i class="fas fa-eye"></i>
            Detayları Gör
          </button>
          ${pkg.package_id.subjects && pkg.package_id.subjects.length > 0 ? `
            <button class="btn btn-sm btn-secondary" onclick="viewLessons('${pkg._id}')">
              <i class="fas fa-chalkboard"></i>
              Dersleri Gör
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderExpiredPackages(packages) {
  const container = document.getElementById('expired-packages');

  if (packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-history" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Geçmiş Paketiniz Bulunmuyor</h3>
        <p>Tamamlanan paketleriniz burada görünecek.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = packages.map(pkg => `
    <div class="card package-card mb-3 expired">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3>${pkg.package_id.name}</h3>
            <p class="text-muted">${pkg.package_id.description}</p>
          </div>
          <span class="badge badge-secondary">Süresi Doldu</span>
        </div>

        <div class="package-details">
          <div class="detail-item">
            <i class="fas fa-calendar-alt"></i>
            <span>
              <strong>Başlangıç:</strong> ${formatDate(pkg.start_date)}
            </span>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar-times"></i>
            <span>
              <strong>Bitiş:</strong> ${formatDate(pkg.end_date)}
            </span>
          </div>
          <div class="detail-item">
            <i class="fas fa-chart-pie"></i>
            <span>
              <strong>Tamamlanma:</strong> ${pkg.progress?.completion_percentage || 0}%
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="package-actions mt-3">
          <button class="btn btn-sm btn-secondary" onclick="viewPackageDetails('${pkg._id}')">
            <i class="fas fa-eye"></i>
            Detayları Gör
          </button>
          <a href="/packages" class="btn btn-sm btn-primary">
            <i class="fas fa-redo"></i>
            Yenile
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPendingPackages(packages) {
  const container = document.getElementById('pending-packages');

  if (packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clock" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Bekleyen Ödemeniz Bulunmuyor</h3>
        <p>Ödeme bekleyen paketleriniz burada görünecek.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = packages.map(pkg => `
    <div class="card package-card mb-3 pending">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3>${pkg.package_id.name}</h3>
            <p class="text-muted">${pkg.package_id.description}</p>
          </div>
          <span class="badge badge-warning">Ödeme Bekliyor</span>
        </div>

        <div class="package-details">
          <div class="detail-item">
            <i class="fas fa-money-bill"></i>
            <span>
              <strong>Tutar:</strong> ${formatCurrency(pkg.package_id.final_price || pkg.package_id.price)}
            </span>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar-plus"></i>
            <span>
              <strong>Oluşturma:</strong> ${formatDate(pkg.created_at)}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="package-actions mt-3">
          <a href="/payment/${pkg.package_id._id}" class="btn btn-sm btn-primary">
            <i class="fas fa-credit-card"></i>
            Ödemeyi Tamamla
          </a>
          <button class="btn btn-sm btn-danger" onclick="cancelPackage('${pkg._id}')">
            <i class="fas fa-times"></i>
            İptal Et
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateTabCounts(active, expired, pending) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs[0].innerHTML = `<i class="fas fa-play-circle"></i> Aktif Paketler (${active})`;
  tabs[1].innerHTML = `<i class="fas fa-clock"></i> Geçmiş Paketler (${expired})`;
  tabs[2].innerHTML = `<i class="fas fa-hourglass-half"></i> Bekleyen Ödemeler (${pending})`;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.style.display = 'none');

      // Add active to clicked
      tab.classList.add('active');
      contents[index].style.display = 'block';
    });
  });
}

// Global functions for button clicks
window.viewPackageDetails = async (packageId) => {
  showToast('Paket detayları yükleniyor...', 'info');
  // TODO: Implement package details modal or page
};

window.viewLessons = async (packageId) => {
  router.navigate(`/student/lessons/${packageId}`);
};

window.cancelPackage = async (packageId) => {
  if (confirm('Bu paketi iptal etmek istediğinizden emin misiniz?')) {
    showToast('Paket iptal ediliyor...', 'info');
    // TODO: Implement package cancellation
  }
};
