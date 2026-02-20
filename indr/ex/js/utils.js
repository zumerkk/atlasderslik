// Utility Functions

// Show toast notification
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-times-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    info: '<i class="fas fa-info-circle"></i>',
  }[type] || '<i class="fas fa-info-circle"></i>';

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Format currency
export function formatCurrency(amount, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Format date
export function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('tr-TR', defaultOptions).format(new Date(date));
}

// Format date with time
export function formatDateTime(date) {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format relative time
export function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now - target) / 1000);

  if (diffInSeconds < 60) return 'Az önce';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;

  return formatDate(date);
}

// Alias for backward compatibility
export const getRelativeTime = formatRelativeTime;

// Check if date is expired
export function isDateExpired(date) {
  return new Date(date) < new Date();
}

// Calculate days until date
export function daysUntil(date) {
  const now = new Date();
  const target = new Date(date);
  const diffInMs = target - now;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays;
}

// Sanitize HTML
export function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Truncate text
export function truncate(str, length = 100) {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

// Debounce function
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Validate email
export function validateEmail(email) {
  const re = /^\S+@\S+\.\S+$/;
  return re.test(email);
}

// Validate password
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber,
    errors: [
      password.length < minLength && 'Şifre en az 8 karakter olmalıdır',
      !hasUpperCase && 'Şifre en az bir büyük harf içermelidir',
      !hasLowerCase && 'Şifre en az bir küçük harf içermelidir',
      !hasNumber && 'Şifre en az bir rakam içermelidir',
    ].filter(Boolean),
  };
}

// Get query parameters
export function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// Set query parameters
export function setQueryParams(params) {
  const searchParams = new URLSearchParams(params);
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
  window.history.pushState({}, '', newUrl);
}

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// LocalStorage utilities
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

export function getFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
}

export function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Panoya kopyalandı', 'success');
  } catch (error) {
    showToast('Kopyalama başarısız', 'error');
  }
}

// Download file
export function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Scroll to top
export function scrollToTop(smooth = true) {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

// Scroll to element
export function scrollToElement(element, offset = 0) {
  const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({
    top: top,
    behavior: 'smooth',
  });
}

// Check if element is in viewport
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get grade level label
export function getGradeLevelLabel(level) {
  const labels = {
    '4': '4. Sınıf',
    '5': '5. Sınıf',
    '6': '6. Sınıf',
    '7': '7. Sınıf',
    '8': '8. Sınıf',
  };
  return labels[level] || level;
}

// Get category label
export function getCategoryLabel(category) {
  const labels = {
    'online-ders': 'Online Ders',
    'yaz-kampi': 'Yaz Kampı',
    'etut': 'Etüt',
  };
  return labels[category] || category;
}

// Get difficulty level label
export function getDifficultyLabel(level) {
  const labels = {
    'beginner': 'Başlangıç',
    'intermediate': 'Orta',
    'advanced': 'İleri',
  };
  return labels[level] || level;
}

// Get status badge class
export function getStatusBadgeClass(status) {
  const classes = {
    pending: 'badge-warning',
    completed: 'badge-success',
    failed: 'badge-danger',
    active: 'badge-success',
    inactive: 'badge-secondary',
  };
  return classes[status] || 'badge-secondary';
}

