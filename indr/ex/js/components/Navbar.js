// Navbar Component
import auth from '../auth.js';
import { state, subscribe } from '../state.js';

export function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = state.user;
  const isAuthenticated = state.isAuthenticated;

  navbar.innerHTML = `
    <div class="navbar-container">
      <a href="/" class="navbar-brand">
        <i class="fas fa-graduation-cap"></i>
        Atlas Derslik
      </a>

      <button class="navbar-toggle" id="navbar-toggle">
        <i class="fas fa-bars"></i>
      </button>

      <ul class="navbar-menu" id="navbar-menu">
        <li class="navbar-item">
          <a href="/" class="navbar-link">Ana Sayfa</a>
        </li>
        <li class="navbar-item">
          <a href="/packages" class="navbar-link">Paketler</a>
        </li>
        
        ${
          isAuthenticated
            ? `
          ${
            user.role === 'student'
              ? `
            <li class="navbar-item">
              <a href="/student/dashboard" class="navbar-link">Dashboard</a>
            </li>
            <li class="navbar-item">
              <a href="/student/packages" class="navbar-link">Paketlerim</a>
            </li>
            <li class="navbar-item">
              <a href="/student/assignments" class="navbar-link">Ödevlerim</a>
            </li>
          `
              : ''
          }
          
          ${
            user.role === 'teacher'
              ? `
            <li class="navbar-item">
              <a href="/teacher/dashboard" class="navbar-link">Dashboard</a>
            </li>
            <li class="navbar-item">
              <a href="/teacher/classes" class="navbar-link">Sınıflarım</a>
            </li>
            <li class="navbar-item">
              <a href="/teacher/assignments" class="navbar-link">Ödevler</a>
            </li>
          `
              : ''
          }
          
          ${
            user.role === 'admin'
              ? `
            <li class="navbar-item">
              <a href="/admin/dashboard" class="navbar-link">Admin Panel</a>
            </li>
            <li class="navbar-item">
              <a href="/admin/users" class="navbar-link">Kullanıcılar</a>
            </li>
            <li class="navbar-item">
              <a href="/admin/classes" class="navbar-link">Sınıflar</a>
            </li>
            <li class="navbar-item">
              <a href="/admin/packages" class="navbar-link">Paketler</a>
            </li>
          `
              : ''
          }
          
          <li class="navbar-item">
            <a href="/profile" class="navbar-link">
              <i class="fas fa-user"></i>
              ${user.full_name || 'Profil'}
            </a>
          </li>
          <li class="navbar-item">
            <button class="btn btn-danger btn-sm" id="logout-btn">
              <i class="fas fa-sign-out-alt"></i>
              Çıkış
            </button>
          </li>
        `
            : `
          <li class="navbar-item">
            <a href="/login" class="btn btn-outline btn-sm">Giriş Yap</a>
          </li>
          <li class="navbar-item">
            <a href="/register" class="btn btn-primary btn-sm">Kayıt Ol</a>
          </li>
        `
        }
      </ul>
    </div>
  `;

  // Setup event listeners
  setupNavbarEvents();
}

function setupNavbarEvents() {
  // Mobile menu toggle
  const toggle = document.getElementById('navbar-toggle');
  const menu = document.getElementById('navbar-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        await auth.logout();
      }
    });
  }

  // Highlight active link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navbar-link').forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

// Subscribe to state changes to re-render navbar
subscribe(() => {
  renderNavbar();
});

