// Teacher Dashboard Page
import api from '../../api.js';
import auth from '../../auth.js';
import { formatDate, showToast } from '../../utils.js';

export async function renderTeacherDashboard() {
  if (!auth.requireRole('teacher')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
        <div class="dashboard-header">
          <div>
            <h1>Öğretmen Dashboard</h1>
            <p class="text-muted">Hoş geldin, ${auth.getUser().full_name}!</p>
          </div>
          <div class="dashboard-actions">
            <a href="/teacher/classes" class="btn btn-primary">
              <i class="fas fa-chalkboard"></i>
              Sınıflarım
            </a>
            <a href="/teacher/assignments" class="btn btn-secondary">
              <i class="fas fa-tasks"></i>
              Ödevler
            </a>
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

          <!-- Today's Lessons -->
          <div class="dashboard-section">
            <h3><i class="fas fa-calendar-day"></i> Bugünün Dersleri</h3>
            <div id="today-lessons"></div>
          </div>

          <!-- Recent Assignments -->
          <div class="dashboard-section">
            <h3><i class="fas fa-tasks"></i> Son Ödevler</h3>
            <div id="recent-assignments"></div>
          </div>

          <!-- Active Classes -->
          <div class="dashboard-section">
            <h3><i class="fas fa-chalkboard"></i> Aktif Sınıflar</h3>
            <div id="active-classes"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load dashboard data
  await loadTeacherDashboard();
}

async function loadTeacherDashboard() {
  const loading = document.getElementById('dashboard-loading');
  const content = document.getElementById('dashboard-content');

  try {
    const response = await api.getTeacherDashboard();
    const data = response.data || {};

    loading.style.display = 'none';
    content.style.display = 'block';

    // Render stats
    renderStats(data);

    // Render today's lessons
    renderTodayLessons(data.today_lessons || []);

    // Render recent assignments
    renderRecentAssignments(data.recent_assignments || []);

    // Render active classes
    renderActiveClasses(data.active_classes || []);
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
        <i class="fas fa-users"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.total_students || 0}</h3>
        <p>Toplam Öğrenci</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon success">
        <i class="fas fa-chalkboard"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.total_classes || 0}</h3>
        <p>Aktif Sınıf</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon warning">
        <i class="fas fa-tasks"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.pending_assignments || 0}</h3>
        <p>Bekleyen Ödev</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon info">
        <i class="fas fa-calendar-week"></i>
      </div>
      <div class="stat-card-content">
        <h3>${data.weekly_lessons || 0}</h3>
        <p>Haftalık Ders</p>
      </div>
    </div>
  `;
}

function renderTodayLessons(lessons) {
  const container = document.getElementById('today-lessons');

  if (lessons.length === 0) {
    container.innerHTML = '<p class="text-muted">Bugün dersiniz bulunmuyor.</p>';
    return;
  }

  container.innerHTML = lessons.map(lesson => `
    <div class="lesson-card">
      <div class="lesson-time">
        <i class="fas fa-clock"></i>
        <span>${formatTime(lesson.start_time)} - ${formatTime(lesson.end_time)}</span>
      </div>
      <div class="lesson-info">
        <h4>${lesson.subject}</h4>
        <p>${lesson.class_id.name} - ${lesson.topic}</p>
      </div>
      <div class="lesson-actions">
        ${lesson.meeting_link ? `
          <a href="${lesson.meeting_link}" target="_blank" class="btn btn-sm btn-primary">
            <i class="fas fa-video"></i>
            Derse Katıl
          </a>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderRecentAssignments(assignments) {
  const container = document.getElementById('recent-assignments');

  if (assignments.length === 0) {
    container.innerHTML = '<p class="text-muted">Henüz ödev bulunmuyor.</p>';
    return;
  }

  container.innerHTML = assignments.map(assignment => {
    const submissionRate = assignment.total_students > 0 
      ? Math.round((assignment.submitted_count / assignment.total_students) * 100) 
      : 0;

    return `
      <div class="assignment-summary-card">
        <div class="assignment-info">
          <h4>${assignment.title}</h4>
          <p>${assignment.class_id.name} - ${assignment.subject}</p>
          <div class="assignment-meta">
            <span><i class="fas fa-calendar"></i> Son: ${formatDate(assignment.due_date)}</span>
            <span><i class="fas fa-users"></i> ${assignment.submitted_count}/${assignment.total_students} teslim edildi</span>
          </div>
        </div>
        <div class="submission-progress">
          <div class="progress-label">Teslim Oranı: ${submissionRate}%</div>
          <div class="progress">
            <div class="progress-bar" style="width: ${submissionRate}%"></div>
          </div>
        </div>
        <a href="/teacher/assignments#${assignment._id}" class="btn btn-sm btn-outline-primary">
          <i class="fas fa-eye"></i>
          Detaylar
        </a>
      </div>
    `;
  }).join('');
}

function renderActiveClasses(classes) {
  const container = document.getElementById('active-classes');

  if (classes.length === 0) {
    container.innerHTML = '<p class="text-muted">Aktif sınıfınız bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-2">
      ${classes.map(cls => `
        <div class="class-card">
          <div class="class-header">
            <h4>${cls.name}</h4>
            <span class="badge badge-primary">${cls.grade_level}. Sınıf</span>
          </div>
          <p class="text-muted">${cls.description || 'Açıklama yok'}</p>
          <div class="class-stats">
            <div class="stat-item">
              <i class="fas fa-users"></i>
              <span>${cls.students.length} Öğrenci</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-book"></i>
              <span>${cls.lesson_count || 0} Ders</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-tasks"></i>
              <span>${cls.assignment_count || 0} Ödev</span>
            </div>
          </div>
          <div class="class-actions">
            <a href="/teacher/classes#${cls._id}" class="btn btn-sm btn-primary">
              <i class="fas fa-eye"></i>
              Görüntüle
            </a>
            <button class="btn btn-sm btn-secondary" onclick="startLesson('${cls._id}')">
              <i class="fas fa-video"></i>
              Ders Başlat
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Helper function
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Global functions
window.startLesson = (classId) => {
  showToast('Ders başlatma özelliği yakında eklenecek', 'info');
};
