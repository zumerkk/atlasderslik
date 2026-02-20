import api from '../../api.js';
import { showToast, formatDate, getRelativeTime } from '../../utils.js';

// Render function for assignments page
export async function renderAssignmentsPage() {
  const app = document.getElementById('app');
  let assignments = [];
  let classes = [];
  
  // Initialize page
  app.innerHTML = `
    <div class="dashboard">
      <div class="container">
      <div class="dashboard-header">
          <div>
            <h1>Ödev Yönetimi</h1>
            <p class="text-muted">Sınıflarınıza ödev verin ve değerlendirin</p>
          </div>
        <button class="btn btn-primary" id="create-assignment-btn">
          <i class="fas fa-plus"></i> Yeni Ödev Ver
        </button>
      </div>

      <div class="assignments-container">
          <div class="mb-3">
            <label class="form-label">Sınıf Filtrele:</label>
            <select class="form-select" id="class-filter" style="max-width: 300px;">
            <option value="">Tüm Sınıflar</option>
          </select>
        </div>

          <div id="assignments-list">
            <div class="text-center py-4">
              <div class="spinner" style="margin: 0 auto;"></div>
              <p class="mt-2">Ödevler yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load data
  try {
    // Load classes first
    const classResponse = await api.getTeacherClasses();
    classes = classResponse.classes || [];
    
    // Update class filter
    const classFilter = document.getElementById('class-filter');
    classes.forEach(classItem => {
      classFilter.innerHTML += `<option value="${classItem._id}">${classItem.name} (${classItem.grade_level}. Sınıf)</option>`;
    });

    // Load assignments
    const response = await api.getTeacherAssignments();
    assignments = response.assignments || [];
    renderAssignments(assignments);
  } catch (error) {
    showToast('Ödevler yüklenirken hata oluştu: ' + error.message, 'error');
    renderAssignments([]);
  }

  // Set up event handlers
  document.getElementById('create-assignment-btn').addEventListener('click', () => showCreateAssignmentModal(classes, assignments));
  document.getElementById('class-filter').addEventListener('change', (e) => {
    const classId = e.target.value;
    const filtered = classId ? assignments.filter(a => a.class_id._id === classId) : assignments;
    renderAssignments(filtered);
  });
}

function renderAssignments(assignments) {
  const list = document.getElementById('assignments-list');

  if (assignments.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>Ödev bulunamadı</h3>
        <p>Henüz ödev oluşturmadınız veya seçili sınıfta ödev yok</p>
      </div>
    `;
    return;
  }

  list.innerHTML = assignments.map(assignment => {
    const submissionCount = assignment.submissions?.length || 0;
    const studentCount = assignment.class_id?.student_count || 0;
    const isOverdue = new Date(assignment.due_date) < new Date();

    return `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 class="card-title">${assignment.title}</h3>
          <span class="badge ${isOverdue ? 'badge-danger' : 'badge-success'}">
            ${isOverdue ? 'Süresi Doldu' : 'Aktif'}
          </span>
        </div>
          
          <div class="assignment-meta mb-3">
            <div class="d-flex gap-3 flex-wrap">
              <span>
                <i class="fas fa-chalkboard"></i>
                <strong>${assignment.class_id?.name || 'Bilinmiyor'}</strong>
              </span>
              <span>
                <i class="fas fa-book"></i>
                ${assignment.subject}
              </span>
              <span>
                <i class="fas fa-calendar"></i>
                Son: ${formatDate(assignment.due_date)}
              </span>
            </div>
          </div>
          
          <div class="progress mb-3" style="height: 20px;">
            <div class="progress-bar" style="width: ${studentCount > 0 ? (submissionCount/studentCount)*100 : 0}%">
              ${submissionCount}/${studentCount} Teslim
            </div>
        </div>
          
          <p class="text-muted mb-3">${assignment.description.substring(0, 100)}...</p>
          
          <button class="btn btn-primary view-assignment-btn" data-assignment-id="${assignment._id}">
          <i class="fas fa-eye"></i> Detaylar ve Değerlendirme
        </button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners
  document.querySelectorAll('.view-assignment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const assignmentId = e.currentTarget.dataset.assignmentId;
      const assignment = assignments.find(a => a._id === assignmentId);
      viewAssignmentDetails(assignment);
    });
  });
}

function showCreateAssignmentModal(classes, assignments) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  // Set minimum due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Yeni Ödev Ver</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="create-assignment-form">
          <div class="form-group">
            <label class="form-label">Ödev Başlığı</label>
            <input type="text" class="form-input" id="assignment-title" required>
          </div>
          <div class="form-group">
            <label class="form-label">Sınıf</label>
            <select class="form-select" id="assignment-class" required>
              <option value="">Sınıf Seçin</option>
              ${classes.map(c => `<option value="${c._id}">${c.name} (${c.grade_level}. Sınıf)</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ders</label>
            <select class="form-select" id="assignment-subject" required>
              <option value="">Ders Seçin</option>
              <option value="Matematik">Matematik</option>
              <option value="Türkçe">Türkçe</option>
              <option value="Fen Bilimleri">Fen Bilimleri</option>
              <option value="İngilizce">İngilizce</option>
              <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Açıklama</label>
            <textarea class="form-textarea" id="assignment-description" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Talimatlar</label>
            <textarea class="form-textarea" id="assignment-instructions" rows="3" 
              placeholder="Ödev nasıl yapılacak, nelere dikkat edilecek..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Son Teslim Tarihi</label>
              <input type="date" class="form-input" id="assignment-due-date" min="${minDate}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Maksimum Puan</label>
              <input type="number" class="form-input" id="assignment-max-score" value="100" min="1" max="100" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Ödev Ver</button>
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

  // Handle form submit
  modal.querySelector('#create-assignment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const classId = document.getElementById('assignment-class').value;
    const selectedClass = classes.find(c => c._id === classId);

    const assignmentData = {
      title: document.getElementById('assignment-title').value,
      class_id: classId,
      subject: document.getElementById('assignment-subject').value,
      description: document.getElementById('assignment-description').value,
      instructions: document.getElementById('assignment-instructions').value || '',
      due_date: document.getElementById('assignment-due-date').value,
      max_score: parseInt(document.getElementById('assignment-max-score').value),
      grade_level: selectedClass ? String(selectedClass.grade_level) : null
    };

    console.log('Creating assignment:', assignmentData);

    try {
      await api.createAssignment(assignmentData);
      showToast('Ödev başarıyla oluşturuldu', 'success');
      modal.remove();
      renderAssignmentsPage(); // Reload page
    } catch (error) {
      console.error('Assignment creation error:', error);
      showToast('Ödev oluşturulurken hata: ' + error.message, 'error');
    }
  });
}

function viewAssignmentDetails(assignment) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  const submissions = assignment.submissions || [];
  const classStudents = assignment.class_id?.student_count || 0;

  modal.innerHTML = `
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2>${assignment.title}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="assignment-details">
          <div class="detail-section">
            <h3>Ödev Bilgileri</h3>
            <p><strong>Sınıf:</strong> ${assignment.class_id?.name || 'Bilinmiyor'}</p>
            <p><strong>Ders:</strong> ${assignment.subject}</p>
            <p><strong>Son Teslim:</strong> ${formatDate(assignment.due_date)}</p>
            <p><strong>Maksimum Puan:</strong> ${assignment.max_score}</p>
            <p><strong>Açıklama:</strong> ${assignment.description}</p>
            ${assignment.instructions ? `<p><strong>Talimatlar:</strong> ${assignment.instructions}</p>` : ''}
          </div>

          <div class="detail-section">
            <h3>Teslim Durumu (${submissions.length}/${classStudents})</h3>
            ${submissions.length === 0 ? 
              '<p class="text-muted">Henüz teslim eden öğrenci yok</p>' :
              `<div class="submissions-list">
                ${submissions.map(sub => `
                  <div class="submission-item">
                    <div class="submission-info">
                      <strong>${sub.student_id?.full_name || 'Bilinmeyen Öğrenci'}</strong>
                      <span class="text-muted">Teslim: ${formatDate(sub.submitted_at)}</span>
                    </div>
                    <div class="submission-grade">
                      ${sub.grade !== undefined ? 
                        `<span class="badge badge-success">${sub.grade}/${assignment.max_score}</span>` :
                        `<button class="btn btn-sm btn-primary grade-submission-btn" 
                          data-assignment-id="${assignment._id}" 
                          data-student-id="${sub.student_id?._id || sub.student_id}">
                          Not Ver
                        </button>`
                      }
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

  modal.querySelectorAll('.grade-submission-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const assignmentId = e.currentTarget.dataset.assignmentId;
      const studentId = e.currentTarget.dataset.studentId;
      
      const score = prompt('Not girin (0-' + assignment.max_score + '):');
      if (!score) return;

      const grade = parseInt(score);
      if (isNaN(grade) || grade < 0 || grade > assignment.max_score) {
        showToast('Geçersiz not değeri', 'error');
        return;
      }

      const feedback = prompt('Geri bildirim (opsiyonel):') || '';

      try {
        await api.gradeAssignment(assignmentId, studentId, { grade, feedback });
        showToast('Not başarıyla verildi', 'success');
        modal.remove();
        renderAssignmentsPage(); // Reload to refresh data
      } catch (error) {
        showToast('Not verilirken hata: ' + error.message, 'error');
      }
    });
  });
}