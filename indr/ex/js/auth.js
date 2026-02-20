// Authentication Manager
import api from './api.js';
import { state, setState } from './state.js';
import { showToast } from './utils.js';

class Auth {
  constructor() {
    this.initAuth();
  }

  // Initialize authentication
  async initAuth() {
    const token = api.getToken();
    if (token) {
      try {
        const response = await api.getMe();
        if (response.success) {
          setState({
            isAuthenticated: true,
            user: response.user,
          });
        } else {
          this.clearAuth();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        this.clearAuth();
      }
    }
  }

  // Login
  async login(email, password) {
    try {
      const response = await api.login({ email, password });

      if (response.success) {
        api.setToken(response.token);
        setState({
          isAuthenticated: true,
          user: response.user,
        });

        showToast('Giriş başarılı! Hoş geldiniz.', 'success');
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      showToast(error.message || 'Giriş başarısız', 'error');
      throw error;
    }
  }

  // Register
  async register(userData) {
    try {
      const response = await api.register(userData);

      if (response.success) {
        api.setToken(response.token);
        setState({
          isAuthenticated: true,
          user: response.user,
        });

        showToast('Kayıt başarılı! Hoş geldiniz.', 'success');
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      showToast(error.message || 'Kayıt başarısız', 'error');
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
      showToast('Çıkış yapıldı', 'info');
      window.location.href = '/';
    }
  }

  // Clear authentication
  clearAuth() {
    api.removeToken();
    setState({
      isAuthenticated: false,
      user: null,
    });
  }

  // Check if user is authenticated
  isAuthenticated() {
    return state.isAuthenticated;
  }

  // Get current user
  getUser() {
    return state.user;
  }

  // Check user role
  hasRole(role) {
    return state.user?.role === role;
  }

  // Check if user has any of the roles
  hasAnyRole(roles) {
    return roles.includes(state.user?.role);
  }

  // Require authentication
  requireAuth(redirectUrl = '/login') {
    if (!this.isAuthenticated()) {
      showToast('Bu sayfayı görüntülemek için giriş yapmalısınız', 'warning');
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  // Require specific role
  requireRole(role, redirectUrl = '/') {
    if (!this.requireAuth()) {
      return false;
    }

    if (!this.hasRole(role)) {
      showToast('Bu sayfaya erişim yetkiniz yok', 'error');
      window.location.href = redirectUrl;
      return false;
    }

    return true;
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      const response = await api.updateProfile(profileData);

      if (response.success) {
        setState({
          user: response.user,
        });
        showToast('Profil güncellendi', 'success');
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      showToast(error.message || 'Profil güncellenemedi', 'error');
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.changePassword(currentPassword, newPassword);

      if (response.success) {
        showToast('Şifre değiştirildi', 'success');
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      showToast(error.message || 'Şifre değiştirilemedi', 'error');
      throw error;
    }
  }
}

// Export singleton instance
export default new Auth();

