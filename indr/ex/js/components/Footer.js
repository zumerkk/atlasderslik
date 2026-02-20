// Footer Component

export function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-section">
        <h4>
          <i class="fas fa-graduation-cap"></i>
          Atlas Derslik
        </h4>
        <p>Türkiye'nin en güvenilir online eğitim platformu. Kaliteli öğretmenlerle birebir dersler alın, akademik başarınızı artırın.</p>
        <div style="margin-top: 1rem;">
          <a href="#" style="margin-right: 1rem; font-size: 1.5rem;">
            <i class="fab fa-facebook"></i>
          </a>
          <a href="#" style="margin-right: 1rem; font-size: 1.5rem;">
            <i class="fab fa-twitter"></i>
          </a>
          <a href="#" style="margin-right: 1rem; font-size: 1.5rem;">
            <i class="fab fa-instagram"></i>
          </a>
          <a href="#" style="font-size: 1.5rem;">
            <i class="fab fa-youtube"></i>
          </a>
        </div>
      </div>

      <div class="footer-section">
        <h4>Hızlı Linkler</h4>
        <ul class="footer-links">
          <li><a href="/">Ana Sayfa</a></li>
          <li><a href="/packages">Paketler</a></li>
          <li><a href="/about">Hakkımızda</a></li>
          <li><a href="/contact">İletişim</a></li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>Kategoriler</h4>
        <ul class="footer-links">
          <li><a href="/category/online-ders">Online Dersler</a></li>
          <li><a href="/category/yaz-kampi">Yaz Kampları</a></li>
          <li><a href="/category/etut">Etüt Hizmetleri</a></li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>İletişim</h4>
        <ul class="footer-links">
          <li>
            <i class="fas fa-phone"></i>
            +90 546 119 10 09
          </li>
          <li>
            <i class="fas fa-envelope"></i>
            atlasderslik@gmail.com
          </li>
          <li>
            <i class="fas fa-map-marker-alt"></i>
            Antalya/Gazipaşa, Türkiye
          </li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} Atlas Derslik. Tüm hakları saklıdır.</p>
    </div>
  `;
}

