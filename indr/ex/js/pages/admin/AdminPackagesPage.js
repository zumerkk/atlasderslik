// Admin Packages Page
import api from '../../api.js';
import auth from '../../auth.js';
import { formatCurrency, showToast } from '../../utils.js';

// Global packages değişkeni
let packages = [];

export async function renderAdminPackagesPage() {
  if (!auth.requireRole('admin')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
        <div class="dashboard-header">
          <div>
            <h1>Paket Yönetimi</h1>
            <p class="text-muted">Eğitim paketlerini yönetin ve düzenleyin</p>
          </div>
          <button class="btn btn-primary" id="create-package-btn">
            <i class="fas fa-plus"></i> Yeni Paket Oluştur
          </button>
        </div>

        <!-- Package Stats -->
        <div class="dashboard-stats mb-4" id="package-stats"></div>

        <!-- Package List -->
        <div class="card">
          <div class="card-header">
            <h3>Paketler</h3>
            <div class="card-actions">
              <select class="form-select" id="category-filter" style="width: 200px;">
                <option value="">Tüm Kategoriler</option>
                <option value="online-ders">Online Ders</option>
                <option value="yaz-kampi">Yaz Kampı</option>
                <option value="etut">Etüt</option>
              </select>
            </div>
          </div>
          <div class="card-body">
            <div id="packages-loading" class="text-center py-4">
              <div class="spinner" style="margin: 0 auto;"></div>
              <p class="mt-2">Paketler yükleniyor...</p>
            </div>
            <div id="packages-grid" style="display: none;">
              <div class="grid grid-cols-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load packages
  await loadPackages();

  // Setup event handlers
  document.getElementById('create-package-btn').addEventListener('click', () => showPackageModal());
  document.getElementById('category-filter').addEventListener('change', (e) => {
    const filtered = e.target.value ? 
      packages.filter(p => p.category === e.target.value) : packages;
    renderPackages(filtered);
  });
}

async function loadPackages() {
  const loading = document.getElementById('packages-loading');
  const grid = document.getElementById('packages-grid');

  try {
    const response = await api.getPackages();
    
    // API response formatını kontrol et
    if (response.success) {
      packages = response.packages || [];
    } else {
      packages = [];
    }
    
    loading.style.display = 'none';
    grid.style.display = 'block';
    
    renderPackageStats(packages);
    renderPackages(packages);
  } catch (error) {
    loading.style.display = 'none';
    showToast('Paketler yüklenirken hata oluştu: ' + error.message, 'error');
    console.error('Error loading packages:', error);
  }
}

function renderPackageStats(packages) {
  const container = document.getElementById('package-stats');
  
  const activeCount = packages.filter(p => p.is_active).length;
  const popularCount = packages.filter(p => p.is_popular).length;
  const premiumCount = packages.filter(p => p.is_premium).length;
  const totalRevenue = packages.reduce((sum, p) => sum + (p.student_count || 0) * p.price, 0);

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-icon primary">
        <i class="fas fa-box"></i>
      </div>
      <div class="stat-card-content">
        <h3>${packages.length}</h3>
        <p>Toplam Paket</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon success">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="stat-card-content">
        <h3>${activeCount}</h3>
        <p>Aktif Paket</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon warning">
        <i class="fas fa-star"></i>
      </div>
      <div class="stat-card-content">
        <h3>${popularCount}</h3>
        <p>Popüler Paket</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon info">
        <i class="fas fa-crown"></i>
      </div>
      <div class="stat-card-content">
        <h3>${premiumCount}</h3>
        <p>Premium Paket</p>
      </div>
    </div>
  `;
}

function renderPackages(packages) {
  const grid = document.querySelector('#packages-grid .grid');

  if (packages.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted col-span-2">Paket bulunamadı</p>';
    return;
  }

  grid.innerHTML = packages.map(pkg => `
    <div class="card package-admin-card">
      <div class="card-header">
        <h4>${pkg.name}</h4>
        <div class="package-badges">
          ${pkg.is_popular ? '<span class="badge badge-primary">Popüler</span>' : ''}
          ${pkg.is_premium ? '<span class="badge badge-warning">Premium</span>' : ''}
          ${!pkg.is_active ? '<span class="badge badge-danger">Pasif</span>' : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="package-info">
          <div class="info-item">
            <span class="label">Kategori:</span>
            <span>${getCategoryLabel(pkg.category)}</span>
          </div>
          <div class="info-item">
            <span class="label">Fiyat:</span>
            <span class="text-success">${formatCurrency(pkg.price)}</span>
          </div>
          ${pkg.discount?.is_active ? `
            <div class="info-item">
              <span class="label">İndirim:</span>
              <span class="text-danger">%${pkg.discount.percentage}</span>
            </div>
          ` : ''}
          <div class="info-item">
            <span class="label">Süre:</span>
            <span>${pkg.duration_months} ay</span>
          </div>
          <div class="info-item">
            <span class="label">Ders Sayısı:</span>
            <span>${pkg.lesson_count || 0}</span>
          </div>
          <div class="info-item">
            <span class="label">Öğrenci Sayısı:</span>
            <span>${pkg.student_count || 0}</span>
          </div>
        </div>

        <p class="text-muted mt-2">${pkg.description.substring(0, 100)}...</p>

        <div class="package-actions mt-3">
          <button class="btn btn-sm btn-primary" onclick="editPackage('${pkg._id}')">
            <i class="fas fa-edit"></i> Düzenle
          </button>
          <button class="btn btn-sm ${pkg.is_active ? 'btn-warning' : 'btn-success'}" 
                  onclick="togglePackageStatus('${pkg._id}', ${pkg.is_active})">
            <i class="fas fa-${pkg.is_active ? 'pause' : 'play'}"></i> 
            ${pkg.is_active ? 'Pasife Al' : 'Aktifleştir'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePackage('${pkg._id}')">
            <i class="fas fa-trash"></i> Sil
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function showPackageModal(packageData = null) {
  const isEdit = packageData !== null;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  
  modal.innerHTML = `
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2>${isEdit ? 'Paket Düzenle' : 'Yeni Paket Oluştur'}</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="package-form">
          <div class="grid grid-cols-2 gap-3">
            <!-- Sol Kolon -->
            <div>
              <div class="form-group">
                <label class="form-label">Paket Adı *</label>
                <input type="text" class="form-input" id="pkg-name" 
                       value="${packageData?.name || ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Kategori *</label>
                <select class="form-select" id="pkg-category" required>
                  <option value="">Seçiniz</option>
                  <option value="online-ders" ${packageData?.category === 'online-ders' ? 'selected' : ''}>
                    Online Ders
                  </option>
                  <option value="yaz-kampi" ${packageData?.category === 'yaz-kampi' ? 'selected' : ''}>
                    Yaz Kampı
                  </option>
                  <option value="etut" ${packageData?.category === 'etut' ? 'selected' : ''}>
                    Etüt
                  </option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Fiyat (TL) *</label>
                  <input type="number" class="form-input" id="pkg-price" 
                         value="${packageData?.price || ''}" min="0" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Süre (Ay) *</label>
                  <input type="number" class="form-input" id="pkg-duration" 
                         value="${packageData?.duration_months || ''}" min="1" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Ders Sayısı</label>
                <input type="number" class="form-input" id="pkg-lessons" 
                       value="${packageData?.lesson_count || ''}" min="0">
              </div>

              <div class="form-group">
                <label class="form-label">Max Öğrenci</label>
                <input type="number" class="form-input" id="pkg-max-students" 
                       value="${packageData?.max_students || ''}" min="1">
              </div>
            </div>

            <!-- Sağ Kolon -->
            <div>
              <div class="form-group">
                <label class="form-label">Açıklama *</label>
                <textarea class="form-textarea" id="pkg-description" rows="4" required>
${packageData?.description || ''}
                </textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Zorluk Seviyesi</label>
                <select class="form-select" id="pkg-difficulty">
                  <option value="">Seçiniz</option>
                  <option value="beginner" ${packageData?.difficulty_level === 'beginner' ? 'selected' : ''}>
                    Başlangıç
                  </option>
                  <option value="intermediate" ${packageData?.difficulty_level === 'intermediate' ? 'selected' : ''}>
                    Orta
                  </option>
                  <option value="advanced" ${packageData?.difficulty_level === 'advanced' ? 'selected' : ''}>
                    İleri
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="pkg-popular" 
                         ${packageData?.is_popular ? 'checked' : ''}>
                  <span>Popüler Paket</span>
                </label>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="pkg-premium" 
                         ${packageData?.is_premium ? 'checked' : ''}>
                  <span>Premium Paket</span>
                </label>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="pkg-active" 
                         ${packageData?.is_active !== false ? 'checked' : ''}>
                  <span>Aktif</span>
                </label>
              </div>

              <!-- İndirim -->
              <div class="card mt-3">
                <div class="card-header">
                  <h4>İndirim Ayarları</h4>
                </div>
                <div class="card-body">
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" id="pkg-discount-active" 
                             ${packageData?.discount?.is_active ? 'checked' : ''}>
                      <span>İndirim Aktif</span>
                    </label>
                  </div>
                  <div class="form-group">
                    <label class="form-label">İndirim Oranı (%)</label>
                    <input type="number" class="form-input" id="pkg-discount-percent" 
                           value="${packageData?.discount?.percentage || ''}" 
                           min="0" max="100">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions mt-4">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
            <button type="submit" class="btn btn-primary">
              ${isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event handlers
  modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector('#package-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('pkg-name').value,
      category: document.getElementById('pkg-category').value,
      description: document.getElementById('pkg-description').value,
      price: parseFloat(document.getElementById('pkg-price').value),
      duration_months: parseInt(document.getElementById('pkg-duration').value),
      lesson_count: parseInt(document.getElementById('pkg-lessons').value) || undefined,
      max_students: parseInt(document.getElementById('pkg-max-students').value) || undefined,
      difficulty_level: document.getElementById('pkg-difficulty').value || undefined,
      is_popular: document.getElementById('pkg-popular').checked,
      is_premium: document.getElementById('pkg-premium').checked,
      is_active: document.getElementById('pkg-active').checked,
      discount: {
        is_active: document.getElementById('pkg-discount-active').checked,
        percentage: parseInt(document.getElementById('pkg-discount-percent').value) || 0
      }
    };

    try {
      if (isEdit) {
        await api.updatePackage(packageData._id, formData);
        showToast('Paket güncellendi', 'success');
      } else {
        await api.createPackage(formData);
        showToast('Paket oluşturuldu', 'success');
      }
      modal.remove();
      await loadPackages();
    } catch (error) {
      showToast('İşlem başarısız: ' + error.message, 'error');
    }
  });

  window.closeModal = () => modal.remove();
}

// Global functions
window.editPackage = async (packageId) => {
  try {
    const response = await api.getPackageById(packageId);
    showPackageModal(response.package);
  } catch (error) {
    showToast('Paket bilgileri yüklenemedi', 'error');
  }
};

window.togglePackageStatus = async (packageId, currentStatus) => {
  try {
    await api.updatePackage(packageId, { is_active: !currentStatus });
    showToast('Paket durumu güncellendi', 'success');
    await loadPackages();
  } catch (error) {
    showToast('İşlem başarısız: ' + error.message, 'error');
  }
};

window.deletePackage = async (packageId) => {
  if (confirm('Bu paketi silmek istediğinizden emin misiniz?')) {
    try {
      await api.deletePackage(packageId);
      showToast('Paket silindi', 'success');
      await loadPackages();
    } catch (error) {
      showToast('Paket silinemedi: ' + error.message, 'error');
    }
  }
};

function getCategoryLabel(category) {
  const labels = {
    'online-ders': 'Online Ders',
    'yaz-kampi': 'Yaz Kampı',
    'etut': 'Etüt'
  };
  return labels[category] || category;
}
