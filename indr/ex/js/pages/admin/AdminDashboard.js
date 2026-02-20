// Admin Dashboard Page
import api from '../../api.js';
import auth from '../../auth.js';
import { formatCurrency, formatDate, showToast } from '../../utils.js';
import router from '../../router.js';

export async function renderAdminDashboard() {
  if (!auth.requireRole('admin')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
        <div class="dashboard-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p class="text-muted">Hoş geldin, ${auth.getUser().full_name}!</p>
          </div>
          <div class="dashboard-actions">
            <button class="btn btn-primary" onclick="window.location.href='/admin/users'">
              <i class="fas fa-users"></i>
              Kullanıcılar
            </button>
            <button class="btn btn-secondary" onclick="window.location.href='/admin/packages'">
              <i class="fas fa-box"></i>
              Paketler
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div id="dashboard-loading" class="text-center py-4">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p class="mt-2">Yükleniyor...</p>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboard-content" style="display: none;">
          <!-- Main Stats -->
          <div class="dashboard-stats" id="main-stats"></div>

          <!-- Revenue Chart and Recent Activity -->
          <div class="grid grid-cols-2 gap-4 mt-4">
            <!-- Revenue Overview -->
            <div class="card">
              <div class="card-header">
                <h3>Gelir Özeti</h3>
              </div>
              <div class="card-body" id="revenue-overview"></div>
            </div>

            <!-- System Status -->
            <div class="card">
              <div class="card-header">
                <h3>Sistem Durumu</h3>
              </div>
              <div class="card-body" id="system-status"></div>
            </div>
          </div>

          <!-- User Stats -->
          <div class="card mt-4">
            <div class="card-header">
              <h3>Kullanıcı İstatistikleri</h3>
            </div>
            <div class="card-body" id="user-stats"></div>
          </div>

          <!-- Recent Payments -->
          <div class="card mt-4">
            <div class="card-header">
              <h3>Son Ödemeler</h3>
              <a href="/admin/payments" class="btn btn-sm btn-primary">
                Tümünü Gör
              </a>
            </div>
            <div class="card-body">
              <div id="recent-payments"></div>
            </div>
          </div>

          <!-- Recent Activities -->
          <div class="card mt-4">
            <div class="card-header">
              <h3>Son Aktiviteler</h3>
            </div>
            <div class="card-body">
              <div id="recent-activities"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load dashboard data
  await loadAdminDashboard();
}

async function loadAdminDashboard() {
  const loading = document.getElementById('dashboard-loading');
  const content = document.getElementById('dashboard-content');

  try {
    const response = await api.getAdminDashboard();
    const data = response.data || {};

    loading.style.display = 'none';
    content.style.display = 'block';

    // Render all sections
    renderMainStats(data);
    renderRevenueOverview(data.revenue || {});
    renderSystemStatus(data.system || {});
    renderUserStats(data.users || {});
    renderRecentPayments(data.recent_payments || []);
    renderRecentActivities(data.recent_activities || []);
  } catch (error) {
    loading.style.display = 'none';
    showToast('Dashboard verileri yüklenirken hata oluştu', 'error');
    console.error('Error loading dashboard:', error);
  }
}

function renderMainStats(data) {
  const statsContainer = document.getElementById('main-stats');

  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-icon primary">
        <i class="fas fa-users"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.total_users || 0}</h3>
        <p>Toplam Kullanıcı</p>
        <small class="text-success">+${data.new_users_this_month || 0} bu ay</small>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon success">
        <i class="fas fa-dollar-sign"></i>
      </div>
      <div class="stat-card-content">
        <h3>${formatCurrency(data.total_revenue || 0)}</h3>
        <p>Toplam Gelir</p>
        <small class="text-success">+${formatCurrency(data.revenue_this_month || 0)} bu ay</small>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon warning">
        <i class="fas fa-box"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.total_packages || 0}</h3>
        <p>Aktif Paket</p>
        <small>${data.active_subscriptions || 0} aktif abonelik</small>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon info">
        <i class="fas fa-chalkboard"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.total_classes || 0}</h3>
        <p>Toplam Sınıf</p>
        <small>${data.active_lessons_today || 0} bugün ders var</small>
      </div>
    </div>
  `;
}

function renderRevenueOverview(revenue) {
  const container = document.getElementById('revenue-overview');

  container.innerHTML = `
    <div class="revenue-stats">
      <div class="revenue-item">
        <span class="revenue-label">Bu Ay</span>
        <span class="revenue-value text-success">${formatCurrency(revenue.this_month || 0)}</span>
      </div>
      <div class="revenue-item">
        <span class="revenue-label">Geçen Ay</span>
        <span class="revenue-value">${formatCurrency(revenue.last_month || 0)}</span>
      </div>
      <div class="revenue-item">
        <span class="revenue-label">Bu Yıl</span>
        <span class="revenue-value">${formatCurrency(revenue.this_year || 0)}</span>
      </div>
    </div>

    <div class="mt-3">
      <h4>Paket Bazlı Gelir</h4>
      ${revenue.by_package && revenue.by_package.length > 0 ? `
        <div class="package-revenue-list">
          ${revenue.by_package.map(pkg => `
            <div class="package-revenue-item">
              <span>${pkg.name}</span>
              <span class="text-success">${formatCurrency(pkg.revenue)}</span>
            </div>
          `).join('')}
        </div>
      ` : '<p class="text-muted">Veri yok</p>'}
    </div>
  `;
}

function renderSystemStatus(system) {
  const container = document.getElementById('system-status');

  const getStatusBadge = (status) => {
    switch(status) {
      case 'operational': return '<span class="badge badge-success">Çalışıyor</span>';
      case 'warning': return '<span class="badge badge-warning">Uyarı</span>';
      case 'error': return '<span class="badge badge-danger">Hata</span>';
      default: return '<span class="badge badge-secondary">Bilinmiyor</span>';
    }
  };

  container.innerHTML = `
    <div class="system-status-list">
      <div class="status-item">
        <span><i class="fas fa-server"></i> Sunucu Durumu</span>
        ${getStatusBadge(system.server_status || 'operational')}
      </div>
      <div class="status-item">
        <span><i class="fas fa-database"></i> Veritabanı</span>
        ${getStatusBadge(system.database_status || 'operational')}
      </div>
      <div class="status-item">
        <span><i class="fas fa-credit-card"></i> Ödeme Sistemi</span>
        ${getStatusBadge(system.payment_status || 'operational')}
      </div>
      <div class="status-item">
        <span><i class="fas fa-video"></i> Video Konferans</span>
        ${getStatusBadge(system.video_status || 'operational')}
      </div>
    </div>

    <div class="mt-3">
      <small class="text-muted">
        Son güncelleme: ${new Date().toLocaleString('tr-TR')}
      </small>
    </div>
  `;
}

function renderUserStats(users) {
  const container = document.getElementById('user-stats');

  container.innerHTML = `
    <div class="grid grid-cols-3">
      <div class="text-center">
        <div class="user-stat-icon student">
          <i class="fas fa-user-graduate"></i>
        </div>
        <h3>${users.students || 0}</h3>
        <p>Öğrenci</p>
      </div>
      <div class="text-center">
        <div class="user-stat-icon teacher">
          <i class="fas fa-chalkboard-teacher"></i>
        </div>
        <h3>${users.teachers || 0}</h3>
        <p>Öğretmen</p>
      </div>
      <div class="text-center">
        <div class="user-stat-icon admin">
          <i class="fas fa-user-shield"></i>
        </div>
        <h3>${users.admins || 0}</h3>
        <p>Yönetici</p>
      </div>
    </div>

    <div class="mt-4">
      <h4>Aktiflik Durumu</h4>
      <div class="activity-stats">
        <div class="activity-item">
          <span>Bugün Aktif</span>
          <strong>${users.active_today || 0}</strong>
        </div>
        <div class="activity-item">
          <span>Bu Hafta Aktif</span>
          <strong>${users.active_this_week || 0}</strong>
        </div>
        <div class="activity-item">
          <span>Bu Ay Aktif</span>
          <strong>${users.active_this_month || 0}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderRecentPayments(payments) {
  const container = document.getElementById('recent-payments');

  if (payments.length === 0) {
    container.innerHTML = '<p class="text-muted">Son ödeme bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kullanıcı</th>
            <th>Paket</th>
            <th>Tutar</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${payments.slice(0, 5).map(payment => `
            <tr>
              <td>${formatDate(payment.created_at)}</td>
              <td>${payment.user?.full_name || 'Bilinmiyor'}</td>
              <td>${payment.package?.name || 'Bilinmiyor'}</td>
              <td>${formatCurrency(payment.amount)}</td>
              <td>
                ${payment.status === 'completed' ? 
                  '<span class="badge badge-success">Başarılı</span>' :
                  payment.status === 'pending' ?
                  '<span class="badge badge-warning">Bekliyor</span>' :
                  '<span class="badge badge-danger">Başarısız</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRecentActivities(activities) {
  const container = document.getElementById('recent-activities');

  if (activities.length === 0) {
    container.innerHTML = '<p class="text-muted">Son aktivite bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <div class="activity-timeline">
      ${activities.slice(0, 10).map(activity => `
        <div class="activity-item">
          <div class="activity-icon ${activity.type}">
            <i class="fas fa-${getActivityIcon(activity.type)}"></i>
          </div>
          <div class="activity-content">
            <p>${activity.description}</p>
            <small class="text-muted">${formatDate(activity.created_at)}</small>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getActivityIcon(type) {
  switch(type) {
    case 'user_register': return 'user-plus';
    case 'payment': return 'credit-card';
    case 'class_created': return 'chalkboard';
    case 'lesson_completed': return 'check-circle';
    case 'assignment_created': return 'tasks';
    default: return 'circle';
  }
}
