// Main Application Entry Point
import router from './router.js';
import auth from './auth.js';
import { renderNavbar } from './components/Navbar.js';
import { renderFooter } from './components/Footer.js';

// Pages
import { renderHomePage } from './pages/HomePage.js';
import { renderLoginPage } from './pages/LoginPage.js';
import { renderRegisterPage } from './pages/RegisterPage.js';
import { renderPackagesPage } from './pages/PackagesPage.js';
import { renderStudentDashboard } from './pages/StudentDashboard.js';
import { renderStudentPackagesPage } from './pages/student/StudentPackagesPage.js';
import { renderStudentAssignmentsPage } from './pages/student/StudentAssignmentsPage.js';
import { renderTeacherDashboard } from './pages/teacher/TeacherDashboard.js';
import { renderClassesPage } from './pages/teacher/ClassesPage.js';
import { renderAssignmentsPage } from './pages/teacher/AssignmentsPage.js';
import { renderAdminDashboard } from './pages/admin/AdminDashboard.js';
import { renderUsersPage } from './pages/admin/UsersPage.js';
import { renderAdminPackagesPage } from './pages/admin/AdminPackagesPage.js';
import { renderAdminClassesPage } from './pages/admin/AdminClassesPage.js';
import { renderPaymentPage } from './pages/PaymentPage.js';
import { renderPaymentCallbackPage } from './pages/PaymentCallbackPage.js';
import { renderPaymentSuccessPage } from './pages/PaymentSuccessPage.js';
import { renderPaymentFailurePage } from './pages/PaymentFailurePage.js';
import { renderPackageDetailPage } from './pages/PackageDetailPage.js';
import { renderAboutPage } from './pages/AboutPage.js';
import { renderContactPage } from './pages/ContactPage.js';
import { renderCategoryPage } from './pages/CategoryPage.js';

// Initialize app
async function initApp() {
  console.log('🚀 Atlas Derslik initializing...');

  // Render static components
  renderNavbar();
  renderFooter();

  // Wait for auth to initialize
  await auth.initAuth();

  // Register routes
  registerRoutes();

  // Initialize router
  router.init();

  console.log('✅ Atlas Derslik ready!');
}

// Register all routes
function registerRoutes() {
  // Public routes
  router.register('/', renderHomePage);
  router.register('/login', renderLoginPage);
  router.register('/register', renderRegisterPage);
  router.register('/packages', renderPackagesPage);
  router.register('/packages/:packageId', renderPackageDetailPage);
  router.register('/about', renderAboutPage);
  router.register('/contact', renderContactPage);
  router.register('/category/:category', renderCategoryPage);
  
  // Payment routes - Static routes MUST come before dynamic routes
  router.register('/payment/callback', renderPaymentCallbackPage);
  
  router.register('/payment/success', renderPaymentSuccessPage, {
    requireAuth: true,
  });
  
  router.register('/payment/failure', renderPaymentFailurePage);
  
  router.register('/payment/:packageId', renderPaymentPage, {
    requireAuth: true,
  });

  // Student routes
  router.register('/student/dashboard', renderStudentDashboard, {
    requireAuth: true,
    requireRole: 'student',
  });

  router.register('/student/packages', renderStudentPackagesPage, {
    requireAuth: true,
    requireRole: 'student',
  });

  router.register('/student/assignments', renderStudentAssignmentsPage, {
    requireAuth: true,
    requireRole: 'student',
  });

  // Teacher routes
  router.register('/teacher/dashboard', renderTeacherDashboard, {
    requireAuth: true,
    requireRole: 'teacher',
  });

  router.register('/teacher/classes', renderClassesPage, {
    requireAuth: true,
    requireRole: 'teacher',
  });

  router.register('/teacher/assignments', renderAssignmentsPage, {
    requireAuth: true,
    requireRole: 'teacher',
  });

  // Admin routes
  router.register('/admin/dashboard', renderAdminDashboard, {
    requireAuth: true,
    requireRole: 'admin',
  });

  router.register('/admin/users', renderUsersPage, {
    requireAuth: true,
    requireRole: 'admin',
  });

  router.register('/admin/packages', renderAdminPackagesPage, {
    requireAuth: true,
    requireRole: 'admin',
  });

  router.register('/admin/classes', renderAdminClassesPage, {
    requireAuth: true,
    requireRole: 'admin',
  });

  // Profile route (all authenticated users)
  router.register('/profile', async () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container py-4">
        <h1>Profil</h1>
        <p>Bu sayfa yakında eklenecek.</p>
      </div>
    `;
  }, {
    requireAuth: true,
  });

  // 404 route
  router.register('/404', () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container" style="padding: 4rem 0; text-align: center;">
        <h1 style="font-size: 6rem; margin: 0;">404</h1>
        <h2>Sayfa Bulunamadı</h2>
        <p style="margin: 2rem 0;">Aradığınız sayfa mevcut değil.</p>
        <a href="/" class="btn btn-primary">Ana Sayfaya Dön</a>
      </div>
    `;
  });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

