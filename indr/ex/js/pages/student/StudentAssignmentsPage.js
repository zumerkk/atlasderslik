// Student Assignments Page
import api from '../../api.js';
import auth from '../../auth.js';
import { formatDate, showToast } from '../../utils.js';

export async function renderStudentAssignmentsPage() {
  if (!auth.requireRole('student')) return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container py-4">
      <div class="dashboard-header">
        <div>
          <h1>Ödevlerim</h1>
          <p class="text-muted">Tüm ödevlerinizi buradan takip edebilirsiniz</p>
        </div>
      </div>

      <!-- Loading -->
      <div id="assignments-loading" class="text-center py-4">
        <div class="spinner" style="margin: 0 auto;"></div>
        <p class="mt-2">Ödevler yükleniyor...</p>
      </div>

      <!-- Tabs -->
      <div id="assignments-tabs" class="tabs" style="display: none;">
        <button class="tab-btn active" data-tab="pending">
          <i class="fas fa-clock"></i>
          Bekleyen Ödevler
        </button>
        <button class="tab-btn" data-tab="submitted">
          <i class="fas fa-check-circle"></i>
          Teslim Edilenler
        </button>
        <button class="tab-btn" data-tab="graded">
          <i class="fas fa-star"></i>
          Notlandırılanlar
        </button>
      </div>

      <!-- Content -->
      <div id="assignments-content" style="display: none;">
        <!-- Pending Assignments -->
        <div id="pending-assignments" class="tab-content active"></div>

        <!-- Submitted Assignments -->
        <div id="submitted-assignments" class="tab-content" style="display: none;"></div>

        <!-- Graded Assignments -->
        <div id="graded-assignments" class="tab-content" style="display: none;"></div>
      </div>
    </div>

    <!-- Submit Assignment Modal -->
    <div id="submit-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Ödev Teslim Et</h3>
          <button class="close-btn" onclick="closeSubmitModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="submit-form">
            <input type="hidden" id="assignment-id">
            
            <div class="form-group">
              <label class="form-label">Açıklama</label>
              <textarea class="form-textarea" id="submission-description" rows="4" placeholder="Ödevinizle ilgili açıklama ekleyin..." required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Dosya Yükle (Opsiyonel)</label>
              <input type="file" class="form-input" id="submission-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
              <small class="text-muted">PDF, Word veya Resim dosyası yükleyebilirsiniz (Max: 10MB)</small>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeSubmitModal()">İptal</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-upload"></i>
                Teslim Et
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Load assignments
  await loadStudentAssignments();

  // Setup tab switching
  setupTabs();

  // Setup form submission
  setupSubmitForm();
}

async function loadStudentAssignments() {
  const loading = document.getElementById('assignments-loading');
  const tabs = document.getElementById('assignments-tabs');
  const content = document.getElementById('assignments-content');

  try {
    const response = await api.getStudentAssignments();
    const assignments = response.assignments || [];

    loading.style.display = 'none';
    tabs.style.display = 'flex';
    content.style.display = 'block';

    // Separate assignments by status
    const pending = assignments.filter(a => !a.submission);
    const submitted = assignments.filter(a => a.submission && !a.submission.grade);
    const graded = assignments.filter(a => a.submission && a.submission.grade);

    // Render each category
    renderPendingAssignments(pending);
    renderSubmittedAssignments(submitted);
    renderGradedAssignments(graded);

    // Update tab counts
    updateTabCounts(pending.length, submitted.length, graded.length);
  } catch (error) {
    loading.style.display = 'none';
    showToast('Ödevler yüklenirken hata oluştu', 'error');
    console.error('Error loading assignments:', error);
  }
}

function renderPendingAssignments(assignments) {
  const container = document.getElementById('pending-assignments');

  if (assignments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-check" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Bekleyen Ödeviniz Yok</h3>
        <p>Tüm ödevlerinizi tamamladınız!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = assignments.map(assignment => {
    const daysLeft = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    const isUrgent = daysLeft <= 2 && daysLeft >= 0;

    return `
      <div class="assignment-card ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}">
        <div class="assignment-header">
          <div>
            <h3>${assignment.title}</h3>
            <p class="text-muted">${assignment.subject} - ${assignment.class_id.name}</p>
          </div>
          <div class="assignment-status">
            ${isOverdue ? '<span class="badge badge-danger">Gecikmiş</span>' : 
              isUrgent ? '<span class="badge badge-warning">Acil</span>' : 
              '<span class="badge badge-primary">Bekliyor</span>'}
          </div>
        </div>

        <div class="assignment-description">
          ${assignment.description}
        </div>

        <div class="assignment-meta">
          <span>
            <i class="fas fa-user"></i>
            ${assignment.teacher_id.full_name}
          </span>
          <span>
            <i class="fas fa-calendar"></i>
            Son Tarih: ${formatDate(assignment.due_date)}
          </span>
          ${assignment.max_points ? `
            <span>
              <i class="fas fa-star"></i>
              ${assignment.max_points} Puan
            </span>
          ` : ''}
        </div>

        <div class="assignment-actions">
          <button class="btn btn-primary" onclick="openSubmitModal('${assignment._id}', '${assignment.title}')">
            <i class="fas fa-upload"></i>
            Teslim Et
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderSubmittedAssignments(assignments) {
  const container = document.getElementById('submitted-assignments');

  if (assignments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-hourglass-half" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Değerlendirme Bekleyen Ödev Yok</h3>
        <p>Teslim ettiğiniz ödevler burada görünecek.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = assignments.map(assignment => `
    <div class="assignment-card submitted">
      <div class="assignment-header">
        <div>
          <h3>${assignment.title}</h3>
          <p class="text-muted">${assignment.subject} - ${assignment.class_id.name}</p>
        </div>
        <span class="badge badge-success">Teslim Edildi</span>
      </div>

      <div class="assignment-description">
        ${assignment.description}
      </div>

      <div class="submission-info">
        <div class="submission-header">
          <i class="fas fa-check-circle text-success"></i>
          <strong>Teslim Bilgileri</strong>
        </div>
        <p>${assignment.submission.content}</p>
        <div class="submission-meta">
          <span>
            <i class="fas fa-clock"></i>
            Teslim Tarihi: ${formatDate(assignment.submission.submitted_at)}
          </span>
        </div>
      </div>

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
    </div>
  `).join('');
}

function renderGradedAssignments(assignments) {
  const container = document.getElementById('graded-assignments');

  if (assignments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-graduation-cap" style="font-size: 3rem; color: var(--gray-300);"></i>
        <h3>Notlandırılan Ödev Yok</h3>
        <p>Notlandırılan ödevleriniz burada görünecek.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = assignments.map(assignment => {
    const gradePercentage = (assignment.submission.grade / assignment.max_points) * 100;
    const gradeColor = gradePercentage >= 85 ? 'success' : 
                      gradePercentage >= 70 ? 'warning' : 'danger';

    return `
      <div class="assignment-card graded">
        <div class="assignment-header">
          <div>
            <h3>${assignment.title}</h3>
            <p class="text-muted">${assignment.subject} - ${assignment.class_id.name}</p>
          </div>
          <div class="grade-badge ${gradeColor}">
            <strong>${assignment.submission.grade}</strong> / ${assignment.max_points}
          </div>
        </div>

        <div class="assignment-description">
          ${assignment.description}
        </div>

        <div class="submission-info">
          <div class="submission-header">
            <i class="fas fa-check-circle text-success"></i>
            <strong>Teslim Bilgileri</strong>
          </div>
          <p>${assignment.submission.content}</p>
          
          ${assignment.submission.feedback ? `
            <div class="feedback-section">
              <div class="feedback-header">
                <i class="fas fa-comment"></i>
                <strong>Öğretmen Yorumu</strong>
              </div>
              <p>${assignment.submission.feedback}</p>
            </div>
          ` : ''}
        </div>

        <div class="assignment-meta">
          <span>
            <i class="fas fa-user"></i>
            ${assignment.teacher_id.full_name}
          </span>
          <span>
            <i class="fas fa-calendar-check"></i>
            Notlandırma: ${formatDate(assignment.submission.graded_at)}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function updateTabCounts(pending, submitted, graded) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs[0].innerHTML = `<i class="fas fa-clock"></i> Bekleyen Ödevler (${pending})`;
  tabs[1].innerHTML = `<i class="fas fa-check-circle"></i> Teslim Edilenler (${submitted})`;
  tabs[2].innerHTML = `<i class="fas fa-star"></i> Notlandırılanlar (${graded})`;
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

function setupSubmitForm() {
  const form = document.getElementById('submit-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const assignmentId = document.getElementById('assignment-id').value;
    const description = document.getElementById('submission-description').value;
    const fileInput = document.getElementById('submission-file');

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
    submitBtn.disabled = true;

    try {
      // For now, we'll just send the text content
      // In a real app, you'd handle file uploads properly
      await api.submitAssignment(assignmentId, {
        content: description
      });

      showToast('Ödev başarıyla teslim edildi', 'success');
      closeSubmitModal();
      await loadStudentAssignments(); // Reload assignments
    } catch (error) {
      showToast('Ödev teslim edilirken hata oluştu', 'error');
      console.error('Error submitting assignment:', error);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Global functions
window.openSubmitModal = (assignmentId, title) => {
  document.getElementById('assignment-id').value = assignmentId;
  document.getElementById('submit-modal').style.display = 'flex';
  document.querySelector('.modal-header h3').textContent = `Ödev Teslim Et: ${title}`;
};

window.closeSubmitModal = () => {
  document.getElementById('submit-modal').style.display = 'none';
  document.getElementById('submit-form').reset();
};
