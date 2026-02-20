import api from '../../api.js';
import { showToast, formatDate, getRelativeTime } from '../../utils.js';

// Render function for users page
export async function renderUsersPage() {
  const app = document.getElementById('app');
  let users = [];
  let currentFilter = 'all';
  
  // Initialize page
  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
      <div class="dashboard-header">
          <div>
        <h1>Kullanıcı Yönetimi</h1>
            <p class="text-muted">Tüm kullanıcıları buradan yönetebilirsiniz</p>
          </div>
        <button class="btn btn-primary" id="create-user-btn">
            <i class="fas fa-plus"></i> Yeni Kullanıcı Ekle
        </button>
      </div>

        <!-- User Stats -->
        <div class="user-stats mb-4" id="user-stats">
          <div class="text-center py-4">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
        </div>

        <!-- Filters and Search -->
        <div class="card mb-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div class="filter-buttons">
                <button class="btn btn-primary filter-btn" data-filter="all">
                  <i class="fas fa-users"></i> Tümü
                </button>
                <button class="btn btn-outline-primary filter-btn" data-filter="student">
                  <i class="fas fa-user-graduate"></i> Öğrenciler
                </button>
                <button class="btn btn-outline-primary filter-btn" data-filter="teacher">
                  <i class="fas fa-chalkboard-teacher"></i> Öğretmenler
                </button>
                <button class="btn btn-outline-primary filter-btn" data-filter="admin">
                  <i class="fas fa-user-shield"></i> Yöneticiler
                </button>
              </div>
              <div class="search-box" style="flex: 1; max-width: 400px;">
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fas fa-search"></i>
                  </span>
                  <input type="text" class="form-control" placeholder="Ad, email veya telefon ile ara..." id="user-search">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
            <thead>
              <tr>
                    <th>Kullanıcı</th>
                    <th>İletişim</th>
                    <th>Rol & Detay</th>
                <th>Kayıt Tarihi</th>
                <th>Durum</th>
                    <th class="text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody id="users-table">
              <tr>
                    <td colspan="6" class="text-center py-4">
                      <div class="spinner" style="margin: 0 auto;"></div>
                      <p class="mt-2">Kullanıcılar yükleniyor...</p>
                </td>
              </tr>
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load users
  try {
    const response = await api.getUsers();
    users = response.users || [];
    renderUserStats(users);
    renderUsersTable(users, currentFilter);
  } catch (error) {
    showToast('Kullanıcılar yüklenirken hata: ' + error.message, 'error');
  }

  // Set up event handlers
  document.getElementById('create-user-btn').addEventListener('click', () => showUserModal(null, users));
  
  document.getElementById('user-search').addEventListener('keyup', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = users.filter(user => 
      user.full_name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
    renderUsersTable(filtered, currentFilter);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentFilter = e.target.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline-primary');
      });
      e.target.classList.remove('btn-outline-primary');
      e.target.classList.add('btn-primary');
      renderUsersTable(users, currentFilter);
    });
  });
}

function renderUsersTable(users, filter = 'all') {
  const tbody = document.getElementById('users-table');
  
  // Filter users
  let filteredUsers = users;
  if (filter !== 'all') {
    filteredUsers = users.filter(user => user.role === filter);
  }

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">Kullanıcı bulunamadı</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => `
    <tr>
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar avatar-sm ${getRoleAvatarClass(user.role)} me-3">
            ${user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="font-weight-bold">${user.full_name}</div>
            <small class="text-muted">ID: ${user._id.slice(-8)}</small>
          </div>
        </div>
      </td>
      <td>
        <div>${user.email}</div>
        ${user.phone ? `<small class="text-muted">${user.phone}</small>` : ''}
      </td>
      <td>
        <span class="badge badge-${getRoleBadgeClass(user.role)} mb-1">
          ${getRoleLabel(user.role)}
        </span>
        ${user.role === 'student' && user.student_data ? 
          `<div><small class="text-muted">${user.student_data.grade_level || '?'}. Sınıf</small></div>` : ''}
        ${user.role === 'teacher' && user.teacher_data ? 
          `<div><small class="text-muted">${user.teacher_data.branch || 'Branş yok'}</small></div>` : ''}
      </td>
      <td>
        <div>${formatDate(user.created_at)}</div>
        <small class="text-muted">${getRelativeTime(user.created_at)}</small>
      </td>
      <td>
        <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
          <i class="fas fa-${user.is_active ? 'check-circle' : 'times-circle'}"></i>
          ${user.is_active ? 'Aktif' : 'Pasif'}
        </span>
      </td>
      <td class="text-center">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary edit-user-btn" 
            data-user='${JSON.stringify(user).replace(/'/g, "&#39;")}'
            title="Düzenle">
          <i class="fas fa-edit"></i>
        </button>
          <button class="btn btn-sm btn-outline-${user.is_active ? 'warning' : 'success'} toggle-user-btn" 
            data-user-id="${user._id}" data-active="${user.is_active}"
            title="${user.is_active ? 'Pasife Al' : 'Aktive Et'}">
          <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
        </button>
          <button class="btn btn-sm btn-outline-danger delete-user-btn" 
            data-user-id="${user._id}"
            title="Sil">
          <i class="fas fa-trash"></i>
        </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const user = JSON.parse(e.currentTarget.dataset.user);
      showUserModal(user);
    });
  });

  document.querySelectorAll('.toggle-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.currentTarget.dataset.userId;
      const isActive = e.currentTarget.dataset.active === 'true';
      try {
        await api.updateUser(userId, { is_active: !isActive });
        showToast('Kullanıcı durumu güncellendi', 'success');
        renderUsersPage(); // Reload
      } catch (error) {
        showToast('İşlem başarısız: ' + error.message, 'error');
      }
    });
  });

  document.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
      
      const userId = e.currentTarget.dataset.userId;
      try {
        await api.deleteUser(userId);
        showToast('Kullanıcı silindi', 'success');
        renderUsersPage(); // Reload
      } catch (error) {
        showToast('Kullanıcı silinemedi: ' + error.message, 'error');
      }
    });
  });
}

function showUserModal(user = null) {
  const isEdit = user !== null;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="user-form">
          <input type="hidden" id="user-id" value="${user?._id || ''}">
          <div class="form-group">
            <label class="form-label">Ad Soyad</label>
            <input type="text" class="form-input" id="user-fullname" value="${user?.full_name || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="user-email" value="${user?.email || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Şifre</label>
            <input type="password" class="form-input" id="user-password" 
              placeholder="${isEdit ? 'Değiştirmek için yeni şifre girin' : 'Şifre'}"
              ${isEdit ? '' : 'required'}>
          </div>
          <div class="form-group">
            <label class="form-label">Rol</label>
            <select class="form-select" id="user-role" required>
              <option value="student" ${user?.role === 'student' ? 'selected' : ''}>Öğrenci</option>
              <option value="teacher" ${user?.role === 'teacher' ? 'selected' : ''}>Öğretmen</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group" id="student-fields" style="${user?.role === 'student' || !user ? 'display:block' : 'display:none'}">
            <label class="form-label">Sınıf</label>
            <select class="form-select" id="user-grade">
              <option value="">Seçiniz</option>
              <option value="4" ${user?.student_data?.grade_level === '4' ? 'selected' : ''}>4. Sınıf</option>
              <option value="5" ${user?.student_data?.grade_level === '5' ? 'selected' : ''}>5. Sınıf</option>
              <option value="6" ${user?.student_data?.grade_level === '6' ? 'selected' : ''}>6. Sınıf</option>
              <option value="7" ${user?.student_data?.grade_level === '7' ? 'selected' : ''}>7. Sınıf</option>
              <option value="8" ${user?.student_data?.grade_level === '8' ? 'selected' : ''}>8. Sınıf</option>
            </select>
          </div>
          <div class="form-group" id="teacher-fields" style="${user?.role === 'teacher' ? 'display:block' : 'display:none'}">
            <label class="form-label">Branş</label>
            <select class="form-select" id="user-branch">
              <option value="">Seçiniz</option>
              <option value="Matematik" ${user?.teacher_data?.branch === 'Matematik' ? 'selected' : ''}>Matematik</option>
              <option value="Türkçe" ${user?.teacher_data?.branch === 'Türkçe' ? 'selected' : ''}>Türkçe</option>
              <option value="Fen Bilimleri" ${user?.teacher_data?.branch === 'Fen Bilimleri' ? 'selected' : ''}>Fen Bilimleri</option>
              <option value="İngilizce" ${user?.teacher_data?.branch === 'İngilizce' ? 'selected' : ''}>İngilizce</option>
              <option value="Sosyal Bilgiler" ${user?.teacher_data?.branch === 'Sosyal Bilgiler' ? 'selected' : ''}>Sosyal Bilgiler</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="user-active" ${user?.is_active !== false ? 'checked' : ''}>
              <span>Aktif</span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Kaydet</button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);

  // Close modal
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Role change handler
  document.getElementById('user-role').addEventListener('change', (e) => {
    document.getElementById('student-fields').style.display = e.target.value === 'student' ? 'block' : 'none';
    document.getElementById('teacher-fields').style.display = e.target.value === 'teacher' ? 'block' : 'none';
  });

  // Form submit handler
  modal.querySelector('#user-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const userData = {
      full_name: document.getElementById('user-fullname').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
      is_active: document.getElementById('user-active').checked
    };

    const password = document.getElementById('user-password').value;
    if (password) {
      userData.password = password;
    }

    if (userData.role === 'student') {
      userData.student_data = {
        grade_level: document.getElementById('user-grade').value
      };
    } else if (userData.role === 'teacher') {
      userData.teacher_data = {
        branch: document.getElementById('user-branch').value
      };
    }

    try {
      if (userId) {
        await api.updateUser(userId, userData);
        showToast('Kullanıcı güncellendi', 'success');
      } else {
        await api.createUser(userData);
        showToast('Kullanıcı oluşturuldu', 'success');
      }

      modal.remove();
      renderUsersPage(); // Reload
    } catch (error) {
      showToast('İşlem başarısız: ' + error.message, 'error');
    }
  });
}

function getRoleBadgeClass(role) {
  const classes = {
    student: 'primary',
    teacher: 'success',
    admin: 'danger'
  };
  return classes[role] || 'secondary';
}

function getRoleLabel(role) {
  const labels = {
    student: 'Öğrenci',
    teacher: 'Öğretmen',
    admin: 'Yönetici'
  };
  return labels[role] || role;
}

function getRoleAvatarClass(role) {
  const classes = {
    student: 'bg-primary',
    teacher: 'bg-success',
    admin: 'bg-danger'
  };
  return classes[role] || 'bg-secondary';
}

function renderUserStats(users) {
  const statsContainer = document.getElementById('user-stats');
  
  const studentCount = users.filter(u => u.role === 'student').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeCount = users.filter(u => u.is_active).length;
  
  statsContainer.innerHTML = `
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-card-icon primary">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-card-content">
          <h3>${users.length}</h3>
          <p>Toplam Kullanıcı</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon primary">
          <i class="fas fa-user-graduate"></i>
        </div>
        <div class="stat-card-content">
          <h3>${studentCount}</h3>
          <p>Öğrenci</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon success">
          <i class="fas fa-chalkboard-teacher"></i>
        </div>
        <div class="stat-card-content">
          <h3>${teacherCount}</h3>
          <p>Öğretmen</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon danger">
          <i class="fas fa-user-shield"></i>
        </div>
        <div class="stat-card-content">
          <h3>${adminCount}</h3>
          <p>Yönetici</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon success">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-card-content">
          <h3>${activeCount}</h3>
          <p>Aktif Kullanıcı</p>
        </div>
      </div>
    </div>
  `;
}