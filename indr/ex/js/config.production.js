// Production Configuration for Frontend
// Bu dosyayı index.html'e ekleyin veya api.js'de kullanın

window.__APP_CONFIG__ = {
  apiBaseUrl: 'https://atlasderslik.com:3002/api',
  environment: 'production',
  version: '1.0.0',
  features: {
    payment: true,
    assignments: true,
    lessons: true
  }
};
