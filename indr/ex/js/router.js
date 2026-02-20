// Simple Client-Side Router
import { setState } from './state.js';
import auth from './auth.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRoute(`${window.location.pathname}${window.location.search}`);
    });
  }

  // Register a route
  register(path, handler, options = {}) {
    this.routes[path] = { handler, options };
  }

  // Navigate to a route
  navigate(path, pushState = true) {
    if (pushState) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute(path);
  }

  // Handle route
  async handleRoute(path) {
    const [pathname, search = ''] = path.split('?');
    const queryParams = search ? Object.fromEntries(new URLSearchParams(search)) : {};

    // Find matching route
    let route = this.routes[pathname];
    let params = [];

    // Try dynamic routes
    if (!route) {
      for (const routePath in this.routes) {
        if (routePath.includes(':')) {
          const pattern = routePath.replace(/:[^\s/]+/g, '([^/]+)');
          const regex = new RegExp(`^${pattern}$`);
          const match = pathname.match(regex);

          if (match) {
            route = this.routes[routePath];
            params = match.slice(1);
            break;
          }
        }
      }
    }

    // Default to 404
    if (!route) {
      route = this.routes['/404'] || { handler: this.render404 };
    }

    // Check authentication
    if (route.options.requireAuth && !auth.isAuthenticated()) {
      this.navigate('/login');
      return;
    }

    // Check role
    if (route.options.requireRole && !auth.hasRole(route.options.requireRole)) {
      this.navigate('/');
      return;
    }

    // Update current page in state
    setState({ currentPage: pathname, query: queryParams });
    this.currentRoute = pathname;

    // Show loading
    this.showLoading();

    try {
      // Execute route handler
      await route.handler(params, queryParams);
    } catch (error) {
      console.error('Route error:', error);
      this.renderError(error);
    } finally {
      this.hideLoading();
    }
  }

  // Render 404 page
  render404() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container" style="padding: 4rem 0; text-align: center;">
        <h1 style="font-size: 6rem; margin: 0;">404</h1>
        <h2>Sayfa Bulunamadı</h2>
        <p style="margin: 2rem 0;">Aradığınız sayfa mevcut değil.</p>
        <a href="/" class="btn btn-primary">Ana Sayfaya Dön</a>
      </div>
    `;
  }

  // Render error page
  renderError(error) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container" style="padding: 4rem 0; text-align: center;">
        <h1 style="font-size: 4rem; margin: 0;">⚠️</h1>
        <h2>Bir Hata Oluştu</h2>
        <p style="margin: 2rem 0;">${error.message || 'Beklenmeyen bir hata oluştu'}</p>
        <a href="/" class="btn btn-primary">Ana Sayfaya Dön</a>
      </div>
    `;
  }

  // Show loading spinner
  showLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.classList.remove('hidden');
    }
  }

  // Hide loading spinner
  hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.classList.add('hidden');
    }
  }

  // Initialize router
  init() {
    // Handle initial route
    this.handleRoute(`${window.location.pathname}${window.location.search}`);

    // Handle link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });
  }
}

// Export singleton instance
export default new Router();

