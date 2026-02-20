// Payment Callback Page
import { showToast } from '../utils.js';
import router from '../router.js';

export async function renderPaymentCallbackPage() {
  const app = document.getElementById('app');
  
  // Show loading
  app.innerHTML = `
    <div class="container py-5">
      <div class="payment-status-container">
        <div class="text-center">
          <div class="spinner mb-4" style="margin: 0 auto; width: 60px; height: 60px;"></div>
          <h2>Ödemeniz İşleniyor</h2>
          <p class="text-muted">İyzico'dan ödeme sonucunu alıyoruz...</p>
          <p class="text-muted" style="font-size: 0.9rem;">
            <i class="fas fa-info-circle"></i>
            Lütfen bekleyin, sayfayı kapatmayın.
          </p>
          <div class="mt-4">
            <div class="progress" style="max-width: 300px; margin: 0 auto; height: 4px;">
              <div class="progress-bar progress-bar-animated" style="width: 100%; background: var(--primary);"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Get token from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  console.log('Payment callback - token:', token);

  if (!token) {
    showToast('Ödeme bilgisi bulunamadı', 'error');
    setTimeout(() => {
      router.navigate('/packages');
    }, 2000);
    return;
  }

  try {
    // Send token to backend via form POST
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'http://localhost:3002/api/payment/callback';
    form.style.display = 'none';
    
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'token';
    tokenInput.value = token;
    
    form.appendChild(tokenInput);
    document.body.appendChild(form);
    
    console.log('Submitting form to backend callback...');
    form.submit();
    
  } catch (error) {
    console.error('Payment callback error:', error);
    showToast('Ödeme işlenirken hata oluştu', 'error');
    setTimeout(() => {
      router.navigate('/packages');
    }, 2000);
  }
}
