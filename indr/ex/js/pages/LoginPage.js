// Login Page
import auth from '../auth.js';
import router from '../router.js';
import { validateEmail } from '../utils.js';

export function renderLoginPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h2>
          <i class="fas fa-sign-in-alt"></i>
          Giriş Yap
        </h2>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              type="email"
              class="form-input"
              id="email"
              placeholder="Email adresiniz"
              required
            />
            <div class="form-error" id="email-error"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Şifre</label>
            <input
              type="password"
              class="form-input"
              id="password"
              placeholder="Şifreniz"
              required
            />
            <div class="form-error" id="password-error"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" id="submit-btn">
            <i class="fas fa-sign-in-alt"></i>
            Giriş Yap
          </button>
        </form>

        <div class="auth-divider">veya</div>

        <p class="text-center">
          Hesabınız yok mu?
          <a href="/register">Kayıt Olun</a>
        </p>
      </div>
    </div>
  `;

  // Setup form
  setupLoginForm();
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    let hasError = false;

    if (!email) {
      document.getElementById('email-error').textContent = 'Email gereklidir';
      hasError = true;
    } else if (!validateEmail(email)) {
      document.getElementById('email-error').textContent = 'Geçerli bir email giriniz';
      hasError = true;
    }

    if (!password) {
      document.getElementById('password-error').textContent = 'Şifre gereklidir';
      hasError = true;
    }

    if (hasError) return;

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';

    try {
      await auth.login(email, password);

      // Redirect based on role
      const user = auth.getUser();
      if (user.role === 'student') {
        router.navigate('/student/dashboard');
      } else if (user.role === 'teacher') {
        router.navigate('/teacher/dashboard');
      } else if (user.role === 'admin') {
        router.navigate('/admin/dashboard');
      } else {
        router.navigate('/');
      }
    } catch (error) {
      // Error is handled in auth.login
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
    }
  });
}

