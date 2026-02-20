// Admin Classes Management Page
import api from '../../api.js';
import auth from '../../auth.js';
import { showToast } from '../../utils.js';

let classes = [];
let teachers = [];
let students = [];

const normalizeClassData = (cls) => {
  if (!cls) return null;

  const teacherObj = typeof cls.teacher_id === 'object' && cls.teacher_id !== null
    ? cls.teacher_id
    : teachers.find(t => t._id === cls.teacher_id) || null;

  const normalizedStudents = Array.isArray(cls.students)
    ? cls.students.map(student => {
        if (typeof student === 'object' && student !== null) {
          return student;
        }
        const found = students.find(s => s._id === student);
        return found || { _id: student };
      })
    : [];

  return {
    ...cls,
    teacher: teacherObj,
    teacher_id: teacherObj ? teacherObj._id : (cls.teacher_id ? cls.teacher_id.toString() : null),
    students: normalizedStudents
  };
};

const handleCreateClassClick = (event) => {
  event?.preventDefault();
  showCreateClassModal();
};

const bindCreateClassButton = () => {
  const button = document.getElementById('create-class-btn');
  if (!button) return;

  if (!button.dataset.bound) {
    button.addEventListener('click', handleCreateClassClick);
    button.dataset.bound = 'true';
  }
};

export async function renderAdminClassesPage() {
  if (!auth.requireRole('admin')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
        <div class="dashboard-header">
          <div>
            <h1>Sınıf Yönetimi</h1>
            <p class="text-muted">Tüm sınıfları yönetin ve öğretmen atamaları yapın</p>
          </div>
          <button class="btn btn-primary" type="button" id="create-class-btn">
            <i class="fas fa-plus"></i> Yeni Sınıf Oluştur
          </button>
        </div>

        <!-- Stats -->
        <div class="dashboard-stats mb-4" id="class-stats"></div>

        <!-- Filters -->
        <div class="card mb-4">
          <div class="card-body">
            <div class="d-flex gap-3 align-items-center">
              <select class="form-select" id="grade-filter" style="width: 150px;">
                <option value="">Tüm Sınıflar</option>
                <option value="4">4. Sınıf</option>
                <option value="5">5. Sınıf</option>
                <option value="6">6. Sınıf</option>
                <option value="7">7. Sınıf</option>
                <option value="8">8. Sınıf</option>
              </select>
              <select class="form-select" id="subject-filter" style="width: 200px;">
                <option value="">Tüm Dersler</option>
                <option value="Matematik">Matematik</option>
                <option value="Türkçe">Türkçe</option>
                <option value="Fen Bilimleri">Fen Bilimleri</option>
                <option value="İngilizce">İngilizce</option>
                <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
              </select>
              <select class="form-select" id="teacher-filter" style="width: 200px;">
                <option value="">Tüm Öğretmenler</option>
              </select>
              <input type="text" class="form-control" placeholder="Sınıf adı ara..." id="search-input" style="max-width: 300px;">
            </div>
          </div>
        </div>

        <!-- Classes List -->
        <div id="classes-loading" class="text-center py-4">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p class="mt-2">Sınıflar yükleniyor...</p>
        </div>

        <div id="classes-grid" style="display: none;">
          <div class="grid grid-cols-2"></div>
        </div>
      </div>
    </div>
  `;

  bindCreateClassButton();

  // Load initial data
  await loadData();

  // Setup event handlers
  bindCreateClassButton();
  document.getElementById('grade-filter').addEventListener('change', filterClasses);
  document.getElementById('subject-filter').addEventListener('change', filterClasses);
  document.getElementById('teacher-filter').addEventListener('change', filterClasses);
  document.getElementById('search-input').addEventListener('input', filterClasses);
  
  // Setup global functions for onclick handlers
  setupGlobalFunctions();
}

async function loadData() {
  const loading = document.getElementById('classes-loading');
  const grid = document.getElementById('classes-grid');

  try {
    // Load all necessary data in parallel
    const [classesRes, teachersRes, studentsRes] = await Promise.all([
      api.getAdminClasses(),
      api.getUsers({ role: 'teacher' }),
      api.getUsers({ role: 'student' })
    ]);

    teachers = teachersRes.users || [];
    students = studentsRes.users || [];
    classes = (classesRes.classes || []).map(normalizeClassData);

    // Populate teacher filter
    const teacherFilter = document.getElementById('teacher-filter');
    const previousTeacherSelection = teacherFilter?.value || '';
    if (teacherFilter) {
      teacherFilter.innerHTML = '<option value="">Tüm Öğretmenler</option>';
      teachers.forEach(teacher => {
        teacherFilter.innerHTML += `<option value="${teacher._id}">${teacher.full_name}</option>`;
      });
      if (previousTeacherSelection && teachers.some(t => t._id === previousTeacherSelection)) {
        teacherFilter.value = previousTeacherSelection;
      }
    }

    loading.style.display = 'none';
    grid.style.display = 'block';

    renderStats();
    filterClasses();
    bindCreateClassButton();
  } catch (error) {
    loading.style.display = 'none';
    showToast('Veriler yüklenirken hata oluştu', 'error');
    console.error('Error loading data:', error);
  }
}

function renderStats() {
  const container = document.getElementById('class-stats');

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.students?.length || 0), 0);
  const avgClassSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
  const fullClasses = classes.filter(cls => cls.students?.length >= cls.max_students).length;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-icon primary">
        <i class="fas fa-chalkboard"></i>
      </div>
      <div class="stat-card-content">
        <h3>${totalClasses}</h3>
        <p>Toplam Sınıf</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon success">
        <i class="fas fa-users"></i>
      </div>
      <div class="stat-card-content">
        <h3>${totalStudents}</h3>
        <p>Toplam Öğrenci</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon info">
        <i class="fas fa-chart-bar"></i>
      </div>
      <div class="stat-card-content">
        <h3>${avgClassSize}</h3>
        <p>Ortalama Sınıf Mevcudu</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-icon warning">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <div class="stat-card-content">
        <h3>${fullClasses}</h3>
        <p>Dolu Sınıf</p>
      </div>
    </div>
  `;
}

function renderClasses(classesToRender) {
  const grid = document.querySelector('#classes-grid .grid');

  if (classesToRender.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted col-span-2">Sınıf bulunamadı</p>';
    return;
  }

  grid.innerHTML = classesToRender.map(cls => {
    const teacherName = cls.teacher?.full_name || teachers.find(t => t._id === cls.teacher_id)?.full_name || 'Öğretmen Atanmamış';
    const studentCount = cls.students?.length || 0;
    const isFull = studentCount >= cls.max_students;

    return `
      <div class="card class-card">
        <div class="card-header">
          <h4>${cls.name}</h4>
          <span class="badge badge-${cls.is_active ? 'success' : 'secondary'}">
            ${cls.is_active ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <div class="card-body">
          <div class="class-info">
            <div class="info-item">
              <i class="fas fa-graduation-cap"></i>
              <span>${cls.grade_level}. Sınıf - ${cls.section}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-book"></i>
              <span>${cls.subject || 'Genel'}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-chalkboard-teacher"></i>
              <span>${teacherName}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-users"></i>
              <span class="${isFull ? 'text-danger' : ''}">
                ${studentCount} / ${cls.max_students} Öğrenci
              </span>
            </div>
          </div>

          ${cls.description ? `<p class="text-muted mt-2">${cls.description}</p>` : ''}

          <div class="class-actions mt-3">
            <button class="btn btn-sm btn-primary" onclick="viewClassDetails('${cls._id}')">
              <i class="fas fa-eye"></i> Detaylar
            </button>
            <button class="btn btn-sm btn-secondary" onclick="editClass('${cls._id}')">
              <i class="fas fa-edit"></i> Düzenle
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClass('${cls._id}')">
              <i class="fas fa-trash"></i> Sil
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterClasses() {
  const gradeFilter = document.getElementById('grade-filter').value;
  const subjectFilter = document.getElementById('subject-filter').value;
  const teacherFilter = document.getElementById('teacher-filter').value;
  const searchInput = document.getElementById('search-input').value.toLowerCase();

  let filtered = classes;

  if (gradeFilter) {
    filtered = filtered.filter(cls => cls.grade_level === gradeFilter);
  }

  if (subjectFilter) {
    filtered = filtered.filter(cls => (cls.subject || 'Genel') === subjectFilter);
  }

  if (teacherFilter) {
    filtered = filtered.filter(cls => cls.teacher_id === teacherFilter);
  }

  if (searchInput) {
    filtered = filtered.filter(cls => 
      cls.name.toLowerCase().includes(searchInput) ||
      cls.description?.toLowerCase().includes(searchInput)
    );
  }

  renderClasses(filtered);
}

function showCreateClassModal(existingClass = null) {
  const isEdit = existingClass !== null;
  const existingTeacherId = existingClass
    ? (typeof existingClass.teacher_id === 'string'
        ? existingClass.teacher_id
        : existingClass.teacher_id?._id || existingClass.teacher?._id || '')
    : '';
  const selectedStudentIds = existingClass
    ? (existingClass.students || []).map(student => (
        typeof student === 'object' && student !== null
          ? student._id
          : student
      ))
    : [];
  const defaultMaxStudents = existingClass?.max_students || 30;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2>${isEdit ? 'Sınıf Düzenle' : 'Yeni Sınıf Oluştur'}</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="class-form">
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Sınıf Adı *</label>
              <input type="text" class="form-input" id="class-name" 
                     value="${existingClass?.name || ''}" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Ders</label>
              <select class="form-select" id="class-subject">
                <option value="Genel" ${!existingClass || !existingClass.subject || existingClass.subject === 'Genel' ? 'selected' : ''}>Genel</option>
                <option value="Matematik" ${existingClass?.subject === 'Matematik' ? 'selected' : ''}>Matematik</option>
                <option value="Türkçe" ${existingClass?.subject === 'Türkçe' ? 'selected' : ''}>Türkçe</option>
                <option value="Fen Bilimleri" ${existingClass?.subject === 'Fen Bilimleri' ? 'selected' : ''}>Fen Bilimleri</option>
                <option value="İngilizce" ${existingClass?.subject === 'İngilizce' ? 'selected' : ''}>İngilizce</option>
                <option value="Sosyal Bilgiler" ${existingClass?.subject === 'Sosyal Bilgiler' ? 'selected' : ''}>Sosyal Bilgiler</option>
                <option value="Din Kültürü" ${existingClass?.subject === 'Din Kültürü' ? 'selected' : ''}>Din Kültürü</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Sınıf Seviyesi *</label>
              <select class="form-select" id="class-grade" required>
                <option value="">Seçiniz</option>
                <option value="4" ${existingClass?.grade_level === '4' ? 'selected' : ''}>4. Sınıf</option>
                <option value="5" ${existingClass?.grade_level === '5' ? 'selected' : ''}>5. Sınıf</option>
                <option value="6" ${existingClass?.grade_level === '6' ? 'selected' : ''}>6. Sınıf</option>
                <option value="7" ${existingClass?.grade_level === '7' ? 'selected' : ''}>7. Sınıf</option>
                <option value="8" ${existingClass?.grade_level === '8' ? 'selected' : ''}>8. Sınıf</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Şube *</label>
              <input type="text" class="form-input" id="class-section" 
                     value="${existingClass?.section || ''}" 
                     placeholder="A" maxlength="1" required>
            </div>

            <div class="form-group">
              <label class="form-label">Öğretmen</label>
              <select class="form-select" id="class-teacher">
                <option value="">Öğretmen Seçin</option>
                ${teachers.map(teacher => `
                  <option value="${teacher._id}" 
                          ${existingTeacherId === teacher._id ? 'selected' : ''}>
                    ${teacher.full_name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Max Öğrenci *</label>
              <input type="number" class="form-input" id="class-max-students" 
                     value="${defaultMaxStudents}" 
                     min="1" max="50" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Öğrenci Ekle</label>
            <select class="form-select" id="class-students" multiple size="8">
              ${students.map(student => `
                <option value="${student._id}" ${selectedStudentIds.includes(student._id) ? 'selected' : ''}>
                  ${student.full_name} - ${student.email}
                  ${student.student_data?.grade_level ? ` (${student.student_data.grade_level}. Sınıf)` : ''}
                </option>
              `).join('')}
            </select>
            <small class="text-muted">Birden fazla öğrenci seçmek için Ctrl / Cmd tuşunu kullanın</small>
          </div>

          <div class="form-group">
            <label class="form-label">Açıklama</label>
            <textarea class="form-textarea" id="class-description" rows="3">${existingClass?.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="class-active" 
                     ${existingClass?.is_active !== false ? 'checked' : ''}>
              <span>Aktif</span>
            </label>
          </div>

          <div class="form-actions">
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

  modal.querySelector('#class-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameValue = document.getElementById('class-name').value.trim();
    const gradeValue = document.getElementById('class-grade').value;
    const sectionValue = document.getElementById('class-section').value.trim().toUpperCase();
    const subjectValue = document.getElementById('class-subject').value || 'Genel';
    const teacherValue = document.getElementById('class-teacher').value;
    const maxStudentsValue = parseInt(document.getElementById('class-max-students').value, 10) || 30;
    const studentSelect = document.getElementById('class-students');
    const selectedStudents = studentSelect
      ? Array.from(studentSelect.selectedOptions).map(opt => opt.value)
      : [];

    if (!nameValue) {
      showToast('Sınıf adı gereklidir', 'warning');
      return;
    }

    if (!gradeValue) {
      showToast('Lütfen sınıf seviyesini seçin', 'warning');
      return;
    }

    if (!sectionValue) {
      showToast('Lütfen şube girin', 'warning');
      return;
    }

    if (!teacherValue) {
      showToast('Lütfen bu sınıf için bir öğretmen seçin', 'warning');
      return;
    }

    if (selectedStudents.length > maxStudentsValue) {
      showToast('Seçili öğrenci sayısı maksimum kontenjanı aşıyor', 'error');
      return;
    }

    const formData = {
      name: nameValue,
      subject: subjectValue,
      grade_level: gradeValue,
      section: sectionValue,
      teacher_id: teacherValue,
      max_students: maxStudentsValue,
      description: document.getElementById('class-description').value || undefined,
      is_active: document.getElementById('class-active').checked,
      students: selectedStudents
    };

    try {
      if (isEdit) {
        await api.updateClass(existingClass._id, formData);
        showToast('Sınıf güncellendi', 'success');
      } else {
        await api.createNewClass(formData);
        showToast('Sınıf oluşturuldu', 'success');
      }
      modal.remove();
      await loadData();
    } catch (error) {
      showToast('İşlem başarısız: ' + error.message, 'error');
    }
  });

  window.closeModal = () => modal.remove();
}

// Global functions - Export to window after DOM is ready
const setupGlobalFunctions = () => {
  window.viewClassDetails = async (classId) => {
  try {
    document.querySelectorAll('.modal.class-details-modal').forEach(m => m.remove());

    const classDetails = await api.getClassById(classId);
    const cls = normalizeClassData(classDetails.class);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.classList.add('class-details-modal');
    modal.style.display = 'flex';

    const teacherName = cls.teacher?.full_name || 'Öğretmen Atanmamış';
    const classStudents = cls.students || [];

    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h2>${cls.name} - Detaylar</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="grid grid-cols-2 gap-4">
            <!-- Sol Taraf - Sınıf Bilgileri -->
            <div>
              <h3>Sınıf Bilgileri</h3>
              <div class="detail-info">
                <div class="info-item">
                  <span class="label">Seviye:</span>
                  <span>${cls.grade_level}. Sınıf - ${cls.section}</span>
                </div>
                <div class="info-item">
                  <span class="label">Ders:</span>
                  <span>${cls.subject || 'Genel'}</span>
                </div>
                <div class="info-item">
                  <span class="label">Öğretmen:</span>
                  <span>${teacherName}</span>
                </div>
                <div class="info-item">
                  <span class="label">Mevcut:</span>
                  <span>${classStudents.length} / ${cls.max_students}</span>
                </div>
                <div class="info-item">
                  <span class="label">Durum:</span>
                  <span class="badge badge-${cls.is_active ? 'success' : 'secondary'}">
                    ${cls.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                ${cls.description ? `
                  <div class="info-item">
                    <span class="label">Açıklama:</span>
                    <p>${cls.description}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Sağ Taraf - Öğrenci Listesi -->
            <div>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>Öğrenciler (${classStudents.length})</h3>
                <button class="btn btn-sm btn-primary" onclick="showAddStudentModal('${classId}')">
                  <i class="fas fa-plus"></i> Öğrenci Ekle
                </button>
              </div>
              
              <div class="student-list">
                ${classStudents.length === 0 ? 
                  '<p class="text-muted">Henüz öğrenci eklenmemiş</p>' :
                  classStudents.map(student => `
                    <div class="student-item">
                      <div>
                        <strong>${student.full_name}</strong>
                        <small class="text-muted">${student.email}</small>
                      </div>
                      <button class="btn btn-sm btn-danger" 
                              onclick="removeStudentFromClass('${classId}', '${student._id}')">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    showToast('Sınıf detayları yüklenemedi', 'error');
  }
};

  window.editClass = async (classId) => {
    try {
      const response = await api.getClassById(classId);
      showCreateClassModal(normalizeClassData(response.class));
    } catch (error) {
      showToast('Sınıf bilgileri yüklenemedi', 'error');
    }
  };

  window.deleteClass = async (classId) => {
    if (confirm('Bu sınıfı silmek istediğinizden emin misiniz?')) {
      try {
        await api.deleteClass(classId);
        showToast('Sınıf silindi', 'success');
        await loadData();
      } catch (error) {
        showToast('Sınıf silinemedi: ' + error.message, 'error');
      }
    }
  };

  window.showAddStudentModal = async (classId) => {
    try {
      // Get class details to see current students
      const classDetails = await api.getClassById(classId);
      const cls = normalizeClassData(classDetails.class);
      const currentStudentIds = cls.students.map(s => s._id);
      
      // Filter available students
      const availableStudents = students.filter(s => !currentStudentIds.includes(s._id));

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Öğrenci Ekle</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          ${availableStudents.length === 0 ? 
            '<p>Eklenebilecek öğrenci bulunamadı</p>' :
            `
              <select class="form-select mb-3" id="student-select" multiple size="10">
                ${availableStudents.map(s => `
                  <option value="${s._id}">
                    ${s.full_name} - ${s.email} 
                    ${s.student_data?.grade_level ? `(${s.student_data.grade_level}. Sınıf)` : ''}
                  </option>
                `).join('')}
              </select>
              <p class="text-muted">Birden fazla öğrenci seçmek için Ctrl/Cmd tuşunu kullanın</p>
              <button class="btn btn-primary" onclick="addSelectedStudents('${classId}')">
                Seçili Öğrencileri Ekle
              </button>
            `
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    window.addSelectedStudents = async (classId) => {
      const select = document.getElementById('student-select');
      const selectedIds = Array.from(select.selectedOptions).map(opt => opt.value);

      if (selectedIds.length === 0) {
        showToast('Lütfen en az bir öğrenci seçin', 'warning');
        return;
      }

      try {
        for (const studentId of selectedIds) {
          await api.addStudentToExistingClass(classId, studentId);
        }
        showToast(`${selectedIds.length} öğrenci eklendi`, 'success');
        modal.remove();
        await loadData();
        viewClassDetails(classId);
      } catch (error) {
        showToast('Öğrenci eklenirken hata: ' + error.message, 'error');
      }
    };
    } catch (error) {
      showToast('Öğrenci listesi yüklenemedi', 'error');
    }
  };

  window.removeStudentFromClass = async (classId, studentId) => {
    if (confirm('Bu öğrenciyi sınıftan çıkarmak istediğinizden emin misiniz?')) {
      try {
        await api.removeStudentFromExistingClass(classId, studentId);
        showToast('Öğrenci sınıftan çıkarıldı', 'success');
        await loadData();
        viewClassDetails(classId);
      } catch (error) {
        showToast('Öğrenci çıkarılırken hata: ' + error.message, 'error');
      }
    }
  };
};
