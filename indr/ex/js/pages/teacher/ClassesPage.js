// Teacher Classes Page
import api from '../../api.js';
import { showToast } from '../../utils.js';

export async function renderClassesPage() {
  const app = document.getElementById('app');
  let classes = [];
  
  // Initialize page
  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
          <div class="dashboard-header">
            <div>
              <h1>Sınıflarım</h1>
              <p class="text-muted">Size atanan sınıfları görüntüleyebilirsiniz</p>
            </div>
          </div>

        <div class="classes-grid" id="classes-grid">
          <div class="text-center py-4">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p class="mt-2">Sınıflar yükleniyor...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load classes
  try {
    const response = await api.getTeacherClasses();
    classes = response.classes || [];
    renderClasses(classes);
  } catch (error) {
    showToast('Sınıflar yüklenirken hata oluştu: ' + error.message, 'error');
    renderClasses([]);
  }
}

function renderClasses(classes) {
  const grid = document.getElementById('classes-grid');
  
  if (classes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chalkboard-teacher"></i>
        <h3>Henüz size atanan sınıf yok</h3>
        <p>Yönetici tarafından bir sınıfa atanmanızı bekleyiniz</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `
    <div class="grid grid-cols-3">
      ${classes.map(classItem => `
        <div class="card class-card">
          <div class="card-header">
            <h3 class="card-title">${classItem.name}</h3>
            <span class="badge badge-primary">${classItem.subject || 'Genel'}</span>
          </div>
          <div class="card-body">
            <div class="class-stats">
              <div class="stat-item">
                <i class="fas fa-graduation-cap"></i>
                <span><strong>${classItem.grade_level}. Sınıf</strong> - ${classItem.section}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-users"></i>
                <span><strong>${classItem.student_count || 0}</strong> / ${classItem.max_students} Öğrenci</span>
              </div>
            </div>
            ${classItem.description ? `<p class="text-muted mt-2">${classItem.description}</p>` : ''}
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary view-class-btn" data-class-id="${classItem._id}">
              <i class="fas fa-eye"></i> Detaylar
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.location.href='/teacher/classes/${classItem._id}/lessons'">
              <i class="fas fa-book"></i> Dersler
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add event listeners
  document.querySelectorAll('.view-class-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const classId = e.currentTarget.dataset.classId;
      viewClassDetails(classId);
    });
  });
}

async function viewClassDetails(classId) {
  try {
    const classDetails = await api.getClassById(classId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const students = classDetails.class.students || [];
    
    modal.innerHTML = `
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>${classDetails.class.name}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="class-details">
            <div class="detail-section">
              <h3>Sınıf Bilgileri</h3>
              <p><strong>Seviye:</strong> ${classDetails.class.grade_level}. Sınıf - ${classDetails.class.section}</p>
              <p><strong>Ders:</strong> ${classDetails.class.subject || 'Genel'}</p>
              <p><strong>Öğrenci Sayısı:</strong> ${students.length}/${classDetails.class.max_students}</p>
              ${classDetails.class.description ? `<p><strong>Açıklama:</strong> ${classDetails.class.description}</p>` : ''}
            </div>

            <div class="detail-section">
              <h3>Öğrenciler (${students.length})</h3>
              ${students.length === 0 ? 
                '<p class="text-muted">Henüz öğrenci eklenmemiş</p>' :
                `<div class="student-list">
                  ${students.map(student => `
                    <div class="student-item">
                      <div>
                        <strong>${student.full_name}</strong>
                        <small class="text-muted">${student.email}</small>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    // Event handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    showToast('Sınıf detayları yüklenemedi: ' + error.message, 'error');
  }
}

// Global function
window.viewClassDetails = viewClassDetails;