// Modal Component

class Modal {
  constructor() {
    this.modalRoot = document.getElementById('modal-root');
  }

  // Show modal
  show(title, content, options = {}) {
    const modalHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal" style="max-width: ${options.maxWidth || '500px'}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          ${
            options.footer
              ? `
            <div class="modal-footer">
              ${options.footer}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    this.modalRoot.innerHTML = modalHTML;

    // Setup event listeners
    this.setupEventListeners();

    // Call onShow callback
    if (options.onShow) {
      options.onShow();
    }
  }

  // Setup event listeners
  setupEventListeners() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  // Close modal
  close() {
    this.modalRoot.innerHTML = '';
  }

  // Confirm dialog
  confirm(title, message, onConfirm) {
    const footer = `
      <button class="btn btn-outline" id="modal-cancel">İptal</button>
      <button class="btn btn-primary" id="modal-confirm">Onayla</button>
    `;

    this.show(title, `<p>${message}</p>`, {
      footer,
      onShow: () => {
        document.getElementById('modal-cancel').addEventListener('click', () => {
          this.close();
        });

        document.getElementById('modal-confirm').addEventListener('click', () => {
          onConfirm();
          this.close();
        });
      },
    });
  }

  // Alert dialog
  alert(title, message) {
    const footer = `
      <button class="btn btn-primary" id="modal-ok">Tamam</button>
    `;

    this.show(title, `<p>${message}</p>`, {
      footer,
      onShow: () => {
        document.getElementById('modal-ok').addEventListener('click', () => {
          this.close();
        });
      },
    });
  }

  // Loading modal
  showLoading(message = 'Yükleniyor...') {
    this.show(
      'Lütfen Bekleyin',
      `
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner" style="margin: 0 auto 1rem;"></div>
        <p>${message}</p>
      </div>
    `,
      {
        maxWidth: '300px',
      }
    );
  }
}

export default new Modal();

