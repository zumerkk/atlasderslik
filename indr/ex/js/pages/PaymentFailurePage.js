// Payment Failure Page
import { showToast } from '../utils.js';

export async function renderPaymentFailurePage() {
  const app = document.getElementById('app');
  
  // Get error from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error') || 'Ödeme başarısız oldu';
  const errorCode = urlParams.get('errorCode');

  app.innerHTML = `
    <div class="container py-5">
      <div class="payment-status-container failure">
        <div class="status-icon">
          <i class="fas fa-times-circle"></i>
        </div>
        <h1>Ödeme Başarısız</h1>
        <p>${decodeURIComponent(error)}</p>
        
        ${errorCode ? `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Hata Kodu: ${errorCode}</span>
          </div>
        ` : ''}
        
        <div class="action-buttons">
          <a href="/packages" class="btn btn-primary">
            <i class="fas fa-redo"></i>
            Tekrar Dene
          </a>
          <a href="/student/dashboard" class="btn btn-secondary">
            <i class="fas fa-home"></i>
            Dashboard
          </a>
        </div>

        <div class="help-info">
          <h3>Yardıma mı ihtiyacınız var?</h3>
          <p>Ödeme sırasında sorun yaşadıysanız bizimle iletişime geçebilirsiniz.</p>
          <a href="/contact" class="btn btn-outline-primary">
            <i class="fas fa-envelope"></i>
            Destek Al
          </a>
        </div>
      </div>
    </div>
  `;

  // Show error toast
  showToast('Ödeme başarısız oldu', 'error');
}
