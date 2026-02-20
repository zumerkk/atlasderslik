// Register Page
import auth from '../auth.js';
import router from '../router.js';
import { validateEmail, validatePassword } from '../utils.js';

export function renderRegisterPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h2>
          <i class="fas fa-user-plus"></i>
          Kayıt Ol
        </h2>

        <form id="register-form">
          <div class="form-group">
            <label class="form-label">Ad Soyad</label>
            <input
              type="text"
              class="form-input"
              id="full_name"
              placeholder="Ad Soyad"
              required
            />
            <div class="form-error" id="full_name-error"></div>
          </div>

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
              placeholder="Şifreniz (en az 8 karakter)"
              required
            />
            <div class="form-help">
              En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir
            </div>
            <div class="form-error" id="password-error"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Şifre Tekrar</label>
            <input
              type="password"
              class="form-input"
              id="password_confirm"
              placeholder="Şifrenizi tekrar giriniz"
              required
            />
            <div class="form-error" id="password_confirm-error"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Kayıt Türü</label>
            <select class="form-select" id="role" required>
              <option value="student">Öğrenci (4-5-6-7-8. Sınıf)</option>
              <option value="teacher">Öğretmen</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" id="submit-btn">
            <i class="fas fa-user-plus"></i>
            Kayıt Ol
          </button>
        </form>

        <div class="auth-divider">veya</div>

        <p class="text-center">
          Zaten hesabınız var mı?
          <a href="/login">Giriş Yapın</a>
        </p>
      </div>
    </div>
  `;

  // Setup form
  setupRegisterForm();
}

function setupRegisterForm() {
  const form = document.getElementById('register-form');
  const fullNameInput = document.getElementById('full_name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('password_confirm');
  const roleSelect = document.getElementById('role');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const role = roleSelect.value;

    // Validation
    let hasError = false;

    if (!fullName) {
      document.getElementById('full_name-error').textContent = 'Ad Soyad gereklidir';
      hasError = true;
    }

    if (!email) {
      document.getElementById('email-error').textContent = 'Email gereklidir';
      hasError = true;
    } else if (!validateEmail(email)) {
      document.getElementById('email-error').textContent = 'Geçerli bir email giriniz';
      hasError = true;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      document.getElementById('password-error').textContent =
        passwordValidation.errors[0];
      hasError = true;
    }

    if (password !== passwordConfirm) {
      document.getElementById('password_confirm-error').textContent = 'Şifreler eşleşmiyor';
      hasError = true;
    }

    if (hasError) return;

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt yapılıyor...';

    try {
      await auth.register({
        full_name: fullName,
        email,
        password,
        role,
      });

      // Redirect based on role
      if (role === 'student') {
        router.navigate('/student/dashboard');
      } else if (role === 'teacher') {
        router.navigate('/teacher/dashboard');
      } else {
        router.navigate('/');
      }
    } catch (error) {
      // Error is handled in auth.register
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Kayıt Ol';
    }
  });
}

