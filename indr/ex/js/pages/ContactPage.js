import { showToast } from '../utils.js';

export async function renderContactPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="contact-page">
      <!-- Hero Section -->
      <section class="contact-hero">
        <div class="container">
          <h1>İletişim</h1>
          <p>Sorularınız mı var? Size yardımcı olmak için buradayız. Bize ulaşın!</p>
        </div>
      </section>

      <!-- Contact Content -->
      <section class="py-5">
        <div class="container">
          <div class="contact-grid">
            <!-- Contact Info -->
            <div class="contact-info">
              <h2>İletişim Bilgileri</h2>
              
              <div class="contact-item">
                <div class="contact-icon" style="background: #E3F2FD;">
                  <i class="fas fa-envelope" style="color: #2196F3;"></i>
                </div>
                <div>
                  <h3>E-posta</h3>
                  <a href="mailto:atlasderslik@gmail.com">atlasderslik@gmail.com</a>
                </div>
              </div>

              <div class="contact-item">
                <div class="contact-icon" style="background: #FFF3E0;">
                  <i class="fas fa-phone" style="color: #FF9800;"></i>
                </div>
                <div>
                  <h3>Telefon</h3>
                  <a href="tel:+905461191009">+90 546 119 10 09</a>
                </div>
              </div>

              <div class="contact-item">
                <div class="contact-icon" style="background: #F3E5F5;">
                  <i class="fas fa-map-marker-alt" style="color: #9C27B0;"></i>
                </div>
                <div>
                  <h3>Adres</h3>
                  <p>Antalya/Gazipaşa, Türkiye</p>
                </div>
              </div>

              <div class="contact-item">
                <div class="contact-icon" style="background: #E8F5E9;">
                  <i class="fas fa-clock" style="color: #4CAF50;"></i>
                </div>
                <div>
                  <h3>Çalışma Saatleri</h3>
                  <p>Pazartesi - Cuma: 09:00 - 18:00</p>
                  <p>Cumartesi: 10:00 - 16:00</p>
                  <p>Pazar: Kapalı</p>
                </div>
              </div>
            </div>

            <!-- Contact Form -->
            <div class="contact-form-wrapper">
              <h2>Bize Mesaj Gönderin</h2>
              <form id="contact-form">
                <div class="form-group">
                  <label class="form-label">Ad Soyad</label>
                  <input type="text" class="form-input" id="contact-name" required>
                </div>

                <div class="form-group">
                  <label class="form-label">E-posta</label>
                  <input type="email" class="form-input" id="contact-email" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Telefon</label>
                  <input type="tel" class="form-input" id="contact-phone">
                </div>

                <div class="form-group">
                  <label class="form-label">Konu</label>
                  <select class="form-select" id="contact-subject" required>
                    <option value="">Seçiniz</option>
                    <option value="genel">Genel Bilgi</option>
                    <option value="paket">Paketler Hakkında</option>
                    <option value="teknik">Teknik Destek</option>
                    <option value="oneri">Öneri/Şikayet</option>
                    <option value="isbirligi">İşbirliği</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Mesajınız</label>
                  <textarea class="form-textarea" id="contact-message" rows="6" required></textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-block">
                  <i class="fas fa-paper-plane"></i> Gönder
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  // Set up form handler
  document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);
}

async function handleContactSubmit(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('contact-name').value,
    email: document.getElementById('contact-email').value,
    phone: document.getElementById('contact-phone').value,
    subject: document.getElementById('contact-subject').value,
    message: document.getElementById('contact-message').value
  };

  // Show success message (in real app, this would send to backend)
  showToast('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.', 'success');
  e.target.reset();

  // In production, you would send this to backend:
  // try {
  //   await api.sendContactMessage(formData);
  //   showToast('Mesajınız başarıyla gönderildi', 'success');
  //   e.target.reset();
  // } catch (error) {
  //   showToast('Mesaj gönderilemedi: ' + error.message, 'error');
  // }
}
