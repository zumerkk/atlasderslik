// API Client for Atlas Derslik
const DEFAULT_API_BASE_URL = 'http://localhost:3002/api';

const getConfiguredApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.apiBaseUrl) {
    return window.__APP_CONFIG__.apiBaseUrl;
  }

  let envBaseUrl;
  try {
    envBaseUrl = import.meta.env?.VITE_API_BASE_URL;
  } catch (error) {
    envBaseUrl = undefined;
  }

  return envBaseUrl || DEFAULT_API_BASE_URL;
};

const normalizeBaseUrl = (url) => {
  if (!url) return DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, '');
};

const API_BASE_URL = normalizeBaseUrl(getConfiguredApiBaseUrl());

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Get auth token
  getToken() {
    return this.token;
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Remove auth token
  removeToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Base request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token if exists
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST'
    });
    this.removeToken();
    return response;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  // Package endpoints
  async getPackages(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/packages${queryString ? `?${queryString}` : ''}`);
  }

  async getPackageById(id) {
    return this.request(`/packages/${id}`);
  }

  async createPackage(packageData) {
    return this.request('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData)
    });
  }

  async updatePackage(id, packageData) {
    return this.request(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packageData)
    });
  }

  async deletePackage(id) {
    return this.request(`/packages/${id}`, {
      method: 'DELETE'
    });
  }

  async addPackageReview(id, reviewData) {
    return this.request(`/packages/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  async getMyPackages() {
    return this.request('/packages/my/packages');
  }

  // Payment endpoints
  async initializePayment(paymentData) {
    return this.request('/payment/initialize', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async getPaymentStatus(paymentId) {
    return this.request(`/payment/status/${paymentId}`);
  }

  async getPaymentHistory() {
    return this.request('/payment/history');
  }

  // Student endpoints
  async getStudentDashboard() {
    return this.request('/student/dashboard');
  }

  async getStudentAssignments() {
    return this.request('/student/assignments');
  }

  async submitAssignment(assignmentId, submissionData) {
    return this.request(`/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData)
    });
  }

  async getStudentClasses() {
    return this.request('/student/classes');
  }

  async searchTeachers(query) {
    return this.request(`/student/teachers?q=${encodeURIComponent(query)}`);
  }

  // Teacher endpoints
  async getTeacherDashboard() {
    return this.request('/teacher/dashboard');
  }

  async getTeacherClasses() {
    return this.request('/teacher/classes');
  }

  async createClass(classData) {
    return this.request('/teacher/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  }

  async updateClass(classId, classData) {
    return this.request(`/teacher/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  }

  async addStudentToClass(classId, studentId) {
    return this.request(`/teacher/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });
  }

  async removeStudentFromClass(classId, studentId) {
    return this.request(`/teacher/classes/${classId}/students`, {
      method: 'DELETE',
      body: JSON.stringify({ student_id: studentId })
    });
  }

  async getTeacherAssignments() {
    return this.request('/teacher/assignments');
  }

  async createAssignment(assignmentData) {
    return this.request('/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  async gradeAssignment(assignmentId, studentId, gradeData) {
    return this.request(`/teacher/assignments/${assignmentId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, ...gradeData })
    });
  }

  async getTeacherStudents() {
    return this.request('/teacher/students');
  }

  // Admin endpoints
  async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  async getUsers(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async createUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async getAnalytics(type) {
    return this.request(`/admin/analytics/${type}`);
  }

  async getAdminPayments(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/admin/payments${queryString ? `?${queryString}` : ''}`);
  }

  // Class endpoints
  async getClasses() {
    return this.request('/classes');
  }

  async getClassById(id) {
    return this.request(`/classes/${id}`);
  }

  async createNewClass(classData) {
    return this.request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  }

  async updateClass(id, classData) {
    return this.request(`/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  }
  
  async updateExistingClass(id, classData) {
    return this.updateClass(id, classData);
  }

  async deleteClass(id) {
    return this.request(`/admin/classes/${id}`, {
      method: 'DELETE'
    });
  }

  async addStudentToExistingClass(classId, studentId) {
    return this.request(`/admin/classes/${classId}/students/add`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });
  }

  async removeStudentFromExistingClass(classId, studentId) {
    return this.request(`/admin/classes/${classId}/students/remove`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });
  }
  
  async getAdminClasses() {
    return this.request('/admin/classes');
  }

  async getClassAssignments(classId) {
    return this.request(`/classes/${classId}/assignments`);
  }

  async getClassLessons(classId) {
    return this.request(`/classes/${classId}/lessons`);
  }

  // Lesson endpoints
  async getLessons() {
    return this.request('/lessons');
  }

  async getUpcomingLessons() {
    return this.request('/lessons/upcoming');
  }

  async getLessonById(id) {
    return this.request(`/lessons/${id}`);
  }

  async createLesson(lessonData) {
    return this.request('/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
  }

  async updateLesson(id, lessonData) {
    return this.request(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData)
    });
  }

  async deleteLesson(id) {
    return this.request(`/lessons/${id}`, {
      method: 'DELETE'
    });
  }

  async updateLessonAttendance(lessonId, studentId, status) {
    return this.request(`/lessons/${lessonId}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, status })
    });
  }
}

// Export singleton instance
const api = new APIClient();
export default api;