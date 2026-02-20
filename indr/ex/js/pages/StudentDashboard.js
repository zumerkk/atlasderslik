// Student Dashboard Page
import api from '../api.js';
import auth from '../auth.js';
import { formatDate, formatCurrency, showToast } from '../utils.js';

export async function renderStudentDashboard() {
  if (!auth.requireRole('student')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
        <div class="dashboard-header">
          <div>
            <h1>Öğrenci Dashboard</h1>
            <p class="text-muted">Hoş geldin, ${auth.getUser().full_name}!</p>
          </div>
        </div>

        <!-- Loading -->
        <div id="dashboard-loading" class="text-center py-4">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p class="mt-2">Yükleniyor...</p>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboard-content" style="display: none;">
          <!-- Stats -->
          <div class="dashboard-stats" id="dashboard-stats"></div>

          <!-- Active Packages -->
          <div class="dashboard-section">
            <h3><i class="fas fa-box"></i> Aktif Paketlerim</h3>
            <div id="active-packages"></div>
          </div>

          <!-- Pending Assignments -->
          <div class="dashboard-section">
            <h3><i class="fas fa-tasks"></i> Bekleyen Ödevler</h3>
            <div id="pending-assignments"></div>
          </div>

          <!-- Classes -->
          <div class="dashboard-section">
            <h3><i class="fas fa-chalkboard"></i> Sınıflarım</h3>
            <div id="student-classes"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load dashboard data
  await loadDashboardData();
}

async function loadDashboardData() {
  const loading = document.getElementById('dashboard-loading');
  const content = document.getElementById('dashboard-content');

  try {
    const response = await api.getStudentDashboard();
    const data = response.data;

    loading.style.display = 'none';
    content.style.display = 'block';

    // Render stats
    renderStats(data);

    // Render active packages
    renderActivePackages(data.active_packages || []);

    // Render pending assignments
    renderPendingAssignments(data.pending_assignments || []);

    // Render classes
    renderClasses(data.classes || []);
  } catch (error) {
    loading.style.display = 'none';
    showToast('Dashboard verileri yüklenirken hata oluştu', 'error');
    console.error('Error loading dashboard:', error);
  }
}

function renderStats(data) {
  const statsContainer = document.getElementById('dashboard-stats');

  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-icon primary">
        <i class="fas fa-box"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.active_packages_count || 0}</h3>
        <p>Aktif Paket</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon success">
        <i class="fas fa-chalkboard"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.classes_count || 0}</h3>
        <p>Sınıf</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon warning">
        <i class="fas fa-tasks"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.pending_assignments_count || 0}</h3>
        <p>Bekleyen Ödev</p>
      </div>
    </div>
  `;
}

function renderActivePackages(packages) {
  const container = document.getElementById('active-packages');

  if (packages.length === 0) {
    container.innerHTML = '<p class="text-muted">Aktif paketiniz bulunmuyor.</p>';
    return;
  }

  container.innerHTML = packages
    .map(
      (pkg) => `
    <div class="card" style="margin-bottom: 1rem;">
      <div class="card-body">
        <h4>${pkg.package_id.name}</h4>
        <p class="text-muted">${pkg.package_id.description}</p>
        
        <div style="display: flex; gap: 2rem; margin-top: 1rem;">
          <div>
            <small class="text-muted">Başlangıç</small>
            <p><strong>${formatDate(pkg.start_date)}</strong></p>
          </div>
          <div>
            <small class="text-muted">Bitiş</small>
            <p><strong>${formatDate(pkg.end_date)}</strong></p>
          </div>
          <div>
            <small class="text-muted">İlerleme</small>
            <p><strong>${pkg.progress.completion_percentage || 0}%</strong></p>
          </div>
        </div>

        ${
          pkg.progress.total_lessons > 0
            ? `
          <div style="margin-top: 1rem;">
            <div style="background: var(--gray-200); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: var(--primary); height: 100%; width: ${pkg.progress.completion_percentage || 0}%;"></div>
            </div>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `
    )
    .join('');
}

function renderPendingAssignments(assignments) {
  const container = document.getElementById('pending-assignments');

  if (assignments.length === 0) {
    container.innerHTML = '<p class="text-muted">Bekleyen ödeviniz bulunmuyor.</p>';
    return;
  }

  container.innerHTML = assignments
    .map(
      (assignment) => `
    <div class="assignment-card">
      <div class="assignment-header">
        <div>
          <h4>${assignment.title}</h4>
          <p class="text-muted">${assignment.subject}</p>
        </div>
        <span class="badge badge-warning">Bekliyor</span>
      </div>
      
      <p>${assignment.description.substring(0, 100)}...</p>
      
      <div class="assignment-meta">
        <span>
          <i class="fas fa-user"></i>
          ${assignment.teacher_id.full_name}
        </span>
        <span>
          <i class="fas fa-calendar"></i>
          Son Tarih: ${formatDate(assignment.due_date)}
        </span>
      </div>
      
      <div style="margin-top: 1rem;">
        <a href="/student/assignments/${assignment._id}" class="btn btn-primary btn-sm">
          <i class="fas fa-edit"></i>
          Teslim Et
        </a>
      </div>
    </div>
  `
    )
    .join('');
}

function renderClasses(classes) {
  const container = document.getElementById('student-classes');

  if (classes.length === 0) {
    container.innerHTML = '<p class="text-muted">Henüz bir sınıfa kayıtlı değilsiniz.</p>';
    return;
  }

  container.innerHTML = classes
    .map(
      (cls) => `
    <div class="card" style="margin-bottom: 1rem;">
      <div class="card-body">
        <h4>${cls.name}</h4>
        <p class="text-muted">${cls.description || ''}</p>
        
        <div style="display: flex; gap: 2rem; margin-top: 1rem;">
          <div>
            <small class="text-muted">Öğretmen</small>
            <p><strong>${cls.teacher_id.full_name}</strong></p>
          </div>
          <div>
            <small class="text-muted">Öğrenci Sayısı</small>
            <p><strong>${cls.student_count}/${cls.max_students}</strong></p>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

