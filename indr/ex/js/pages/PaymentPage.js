import api from '../api.js';
import { showToast, formatCurrency } from '../utils.js';
import auth from '../auth.js';

export async function renderPaymentPage(params) {
  const app = document.getElementById('app');
  
  // Get packageId from params array
  const packageId = params && params[0] ? params[0] : null;
  
  if (!packageId) {
    showToast('Paket seçilmedi', 'error');
    window.location.href = '/packages';
    return;
  }
  
  // Show loading
  app.innerHTML = `
    <div class="container py-4">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Ödeme başlatılıyor...</p>
      </div>
    </div>
  `;

  try {
    // Check if user is logged in
    const user = auth.getUser();
    if (!user) {
      showToast('Ödeme yapmak için giriş yapmalısınız', 'warning');
      window.location.href = '/login';
      return;
    }

    // Get package details first
    const packageResponse = await api.getPackageById(packageId);
    const pkg = packageResponse.package;
    
    // Initialize payment directly - İyzico will handle installments
    showToast('İyzico ödeme sayfasına yönlendiriliyorsunuz...', 'info');
    
    const paymentData = {
      packageId: packageId,
      installments: 1 // Default, İyzico will show available options
    };
    
    const paymentResponse = await api.initializePayment(paymentData);

    if (paymentResponse.success && paymentResponse.checkoutFormContent) {
      // Show package info and İyzico form
      app.innerHTML = `
        <div class="container py-4">
          <div class="payment-container">
            <div class="payment-header">
              <h1>Güvenli Ödeme</h1>
              <p>İyzico güvenli ödeme sistemi</p>
            </div>

            <!-- Package Summary -->
            <div class="payment-summary mb-4">
              <h2>Sipariş Özeti</h2>
              <div class="package-summary">
                <h3>${pkg.name}</h3>
                <p>${pkg.description}</p>
                <div class="price-details">
                  <div class="final-price">
                    <span>Toplam:</span>
                    <span class="price-amount">${formatCurrency(pkg.final_price || pkg.price)}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- İyzico Payment Form -->
            <div id="iyzipay-checkout-form" class="popup"></div>

            <div class="security-badges mt-4">
              <img src="https://www.iyzico.com/assets/images/content/logo.svg" alt="iyzico" height="30">
              <div class="ssl-badge">
                <i class="fas fa-shield-alt"></i>
                <span>256-bit SSL</span>
              </div>
              <div class="pci-badge">
                <i class="fas fa-credit-card"></i>
                <span>PCI-DSS</span>
              </div>
            </div>

            <div class="payment-info mt-4">
              <p class="text-muted">
                <i class="fas fa-info-circle"></i>
                Taksit seçeneklerini ödeme ekranında görebilirsiniz. Kredi kartınıza göre farklı taksit seçenekleri sunulacaktır.
              </p>
            </div>
          </div>
        </div>
      `;

      // İyzico script'lerini çalıştır
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = paymentResponse.checkoutFormContent;
      
      // Script tag'lerini bul ve çalıştır
      const scripts = tempDiv.getElementsByTagName('script');
      for (let script of scripts) {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        newScript.type = script.type || 'text/javascript';
        document.head.appendChild(newScript);
      }

    } else if (paymentResponse.paymentPageUrl) {
      // Redirect to İyzico payment page
      window.location.href = paymentResponse.paymentPageUrl;
    } else {
      throw new Error(paymentResponse.message || 'Ödeme başlatılamadı');
    }

  } catch (error) {
    showToast('Ödeme başlatılırken hata oluştu: ' + error.message, 'error');
    app.innerHTML = `
      <div class="container py-4">
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Bir hata oluştu</h3>
          <p>${error.message}</p>
          <a href="/packages" class="btn btn-primary">Paketlere Dön</a>
        </div>
      </div>
    `;
  }
}