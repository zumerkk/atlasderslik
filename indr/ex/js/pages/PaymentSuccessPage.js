import api from '../api.js';
import { showToast, formatCurrency } from '../utils.js';

export async function renderPaymentSuccessPage() {
  const app = document.getElementById('app');
  
  // Get params from URL
  const urlParams = new URLSearchParams(window.location.search);
  const paymentId = urlParams.get('paymentId') || urlParams.get('payment_id');
  
  if (!paymentId) {
    window.location.href = '/packages';
    return;
  }

  // Show checking status
  app.innerHTML = `
    <div class="container py-4">
      <div class="payment-status-container">
        <div class="text-center">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p class="mt-3">Ödeme durumu kontrol ediliyor...</p>
        </div>
      </div>
    </div>
  `;

  try {
    // Check payment status
    const response = await api.getPaymentStatus(paymentId);
    
    if (response.success && response.payment) {
      const payment = response.payment;
      
      if (payment.status === 'completed') {
        // Payment successful
        app.innerHTML = `
          <div class="container py-4">
            <div class="payment-status-container success">
              <div class="status-icon">
                <i class="fas fa-check-circle"></i>
              </div>
              <h1>🎉 Ödemeniz Başarılı!</h1>
              <p>Paket satın alma işleminiz başarıyla tamamlandı. Eğitiminize hemen başlayabilirsiniz!</p>
              
              <div class="payment-details card">
                <div class="card-body">
                  <h3>Ödeme Detayları</h3>
                  <div class="detail-row">
                    <span>İşlem No:</span>
                    <strong>${payment.iyzico_payment_id || paymentId}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Paket:</span>
                    <strong>${payment.package_id?.name || 'Eğitim Paketi'}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Tutar:</span>
                    <strong>${formatCurrency(payment.amount)}</strong>
                  </div>
                  ${payment.installment > 1 ? `
                    <div class="detail-row">
                      <span>Taksit:</span>
                      <strong>${payment.installment} Taksit</strong>
                    </div>
                  ` : ''}
                  <div class="detail-row">
                    <span>Tarih:</span>
                    <strong>${new Date(payment.created_at).toLocaleDateString('tr-TR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</strong>
                  </div>
                </div>
              </div>

              <div class="action-buttons">
                <a href="/student/packages" class="btn btn-primary">
                  <i class="fas fa-book"></i> Paketlerime Git
                </a>
                <a href="/student/dashboard" class="btn btn-secondary">
                  <i class="fas fa-home"></i> Dashboard'a Dön
                </a>
              </div>
            </div>
          </div>
        `;

        showToast('Ödemeniz başarıyla alındı. Paketiniz aktif edildi!', 'success');
      } else if (payment.status === 'failed') {
        // Payment failed
        app.innerHTML = `
          <div class="container py-4">
            <div class="payment-status-container error">
              <div class="status-icon">
                <i class="fas fa-times-circle"></i>
              </div>
              <h1>Ödeme Başarısız</h1>
              <p>Ödeme işlemi tamamlanamadı.</p>
              
              ${payment.error_message ? `
                <div class="error-message">
                  <i class="fas fa-exclamation-triangle"></i>
                  ${payment.error_message}
                </div>
              ` : ''}

              <div class="action-buttons">
                <a href="/packages" class="btn btn-primary">
                  <i class="fas fa-redo"></i> Tekrar Dene
                </a>
                <a href="/contact" class="btn btn-secondary">
                  <i class="fas fa-envelope"></i> Destek Al
                </a>
              </div>
            </div>
          </div>
        `;
      } else {
        // Payment pending
        app.innerHTML = `
          <div class="container py-4">
            <div class="payment-status-container warning">
              <div class="status-icon">
                <i class="fas fa-clock"></i>
              </div>
              <h1>Ödeme İşleniyor</h1>
              <p>Ödemeniz henüz işleme alınıyor. Lütfen birkaç dakika bekleyin.</p>
              
              <div class="action-buttons">
                <button class="btn btn-primary" onclick="location.reload()">
                  <i class="fas fa-sync"></i> Durumu Kontrol Et
                </button>
                <a href="/student/dashboard" class="btn btn-secondary">
                  <i class="fas fa-home"></i> Dashboard'a Dön
                </a>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      throw new Error('Ödeme bilgileri alınamadı');
    }
  } catch (error) {
    console.error('Payment status error:', error);
    app.innerHTML = `
      <div class="container py-4">
        <div class="payment-status-container error">
          <div class="status-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h1>Bir Hata Oluştu</h1>
          <p>Ödeme durumu kontrol edilemedi.</p>
          
          <div class="error-message">
            ${error.message}
          </div>

          <div class="action-buttons">
            <a href="/student/dashboard" class="btn btn-primary">
              <i class="fas fa-home"></i> Dashboard'a Dön
            </a>
            <a href="/contact" class="btn btn-secondary">
              <i class="fas fa-envelope"></i> Destek Al
            </a>
          </div>
        </div>
      </div>
    `;
  }
}
