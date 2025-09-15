// API service for Life Sheet backend integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.pending = new Map();
    this.dedupeWindowMs = 300;
  }

  // Helper method for making API requests with deduplication
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const dedupeKey = `${method} ${endpoint}`;
    const now = Date.now();
    
    // Check for existing in-flight request
    const existing = this.pending.get(dedupeKey);
    if (existing && (now - existing.ts) < this.dedupeWindowMs) {
      return existing.promise; // reuse in-flight promise
    }

    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    const controller = new AbortController();
    const signal = controller.signal;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
      signal,
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          // If token is invalid, clear it
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
          }
          throw new Error(errorText || `API request failed with status ${response.status}`);
        }
        
        return await response.json();
      } finally {
        // Clean up pending request
        const cur = this.pending.get(dedupeKey);
        if (cur && cur.promise === fetchPromise) {
          this.pending.delete(dedupeKey);
        }
      }
    })();

    // Store pending request
    this.pending.set(dedupeKey, { ts: now, promise: fetchPromise, controller });
    return fetchPromise;
  }

  // Authentication APIs
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: userData,
    });
  }

  async login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: credentials,
    });
  }

  async logout() {
    return this.request('/logout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async changePassword(passwordData) {
    return this.request('/change-password', {
      method: 'POST',
      body: passwordData,
    });
  }

  // OAuth APIs
  async initiateGoogleLogin() {
    // Get the OAuth URL from backend
    const response = await this.request('/oauth/google/login', {
      method: 'GET',
    });
    return response;
  }

  async initiateFacebookLogin() {
    // Get the OAuth URL from backend
    const response = await this.request('/oauth/facebook/login', {
      method: 'GET',
    });
    return response;
  }

  // Demo OAuth APIs (for testing)
  async googleLoginDemo() {
    return this.request('/oauth/demo/google', {
      method: 'GET',
    });
  }

  async facebookLoginDemo() {
    return this.request('/oauth/demo/facebook', {
      method: 'GET',
    });
  }

  // Financial APIs
  async createFinancialProfile(profileData) {
    return this.request('/financial/profile', {
      method: 'POST',
      body: profileData,
    });
  }

  async getFinancialProfile(userId) {
    return this.request(`/financial/profile/${userId}`);
  }

  async updateFinancialProfile(profileId, profileData) {
    return this.request(`/financial/profile/${profileId}`, {
      method: 'PUT',
      body: profileData,
    });
  }

  async createFinancialGoal(goalData) {
    return this.request('/financial/goals', {
      method: 'POST',
      body: goalData,
    });
  }

  async getFinancialGoals(userId) {
    return this.request(`/financial/goals/${userId}`);
  }

  async updateFinancialGoal(goalId, goalData) {
    return this.request(`/financial/goals/${goalId}`, {
      method: 'PUT',
      body: goalData,
    });
  }

  async deleteFinancialGoal(goalId) {
    return this.request(`/financial/goals/${goalId}`, {
      method: 'DELETE',
    });
  }

  // Financial Expenses APIs
  async createFinancialExpense(expenseData) {
    return this.request('/financial/expenses', {
      method: 'POST',
      body: expenseData,
    });
  }

  async getFinancialExpenses(userId) {
    return this.request(`/financial/expenses/${userId}`);
  }

  async updateFinancialExpense(expenseId, expenseData) {
    return this.request(`/financial/expenses/${expenseId}`, {
      method: 'PUT',
      body: expenseData,
    });
  }

  async deleteFinancialExpense(expenseId) {
    return this.request(`/financial/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  async createFinancialScenario(scenarioData) {
    return this.request('/financial/scenarios', {
      method: 'POST',
      body: scenarioData,
    });
  }

  async getFinancialScenarios(userId) {
    return this.request(`/financial/scenarios/${userId}`);
  }

  async createFinancialLoan(data) {
    return this.request('/financial/loans', {
      method: 'POST',
      body: data,
    });
  }

  async getFinancialLoans(userId) {
    return this.request(`/financial/loans/${userId}`);
  }

  async updateFinancialLoan(loanId, data) {
    return this.request(`/financial/loans/${loanId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFinancialLoan(loanId) {
    return this.request(`/financial/loans/${loanId}`, {
      method: 'DELETE',
    });
  }

  // Financial Expenses APIs
  async createFinancialExpense(expenseData) {
    return this.request('/financial/expense', {
      method: 'POST',
      body: expenseData,
    });
  }

  async getFinancialExpenses(userId) {
    return this.request(`/financial/expense/${userId}`);
  }

  async updateFinancialExpense(expenseId, data) {
    return this.request(`/financial/expense/${expenseId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFinancialExpense(expenseId) {
    return this.request(`/financial/expense/${expenseId}`, {
      method: 'DELETE',
    });
  }

  // Financial Insurance APIs
  async createFinancialInsurance(insuranceData) {
    return this.request('/financial/insurance', {
      method: 'POST',
      body: insuranceData,
    });
  }

  async getFinancialInsurance(userId) {
    return this.request(`/financial/insurance/${userId}`);
  }

  async updateFinancialInsurance(insuranceId, data) {
    return this.request(`/financial/insurance/${insuranceId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFinancialInsurance(insuranceId) {
    return this.request(`/financial/insurance/${insuranceId}`, {
      method: 'DELETE',
    });
  }

  // Financial Assets APIs
  async createFinancialAsset(assetData) {
    return this.request('/financial/assets', {
      method: 'POST',
      body: assetData,
    });
  }

  async getFinancialAssets(userId) {
    return this.request(`/financial/assets/${userId}`);
  }

  async updateFinancialAsset(assetId, data) {
    return this.request(`/financial/assets/${assetId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFinancialAsset(assetId) {
    return this.request(`/financial/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  // Asset Columns APIs
  async getAssetColumns(userId) {
    return this.request(`/financial/asset-columns/${userId}`);
  }

  async createAssetColumn(columnData) {
    return this.request('/financial/asset-columns', {
      method: 'POST',
      body: columnData,
    });
  }

  async updateAssetColumn(columnId, columnData) {
    return this.request(`/financial/asset-columns/${columnId}`, {
      method: 'PUT',
      body: columnData,
    });
  }

  async deleteAssetColumn(columnId) {
    return this.request(`/financial/asset-columns/${columnId}`, {
      method: 'DELETE',
    });
  }

  // User Tags APIs
  async getUserTags(userId) {
    return this.request(`/financial/user-tags/${userId}`);
  }

  async createUserTag(tagData) {
    return this.request('/financial/user-tag', {
      method: 'POST',
      body: tagData,
    });
  }

  async deleteUserTag(tagId) {
    return this.request(`/financial/user-tag/${tagId}`, {
      method: 'DELETE',
    });
  }

  // Work Assets APIs
  async createWorkAsset(workAssetData) {
    return this.request('/financial/work-asset', {
      method: 'POST',
      body: workAssetData,
    });
  }

  async getWorkAssets(userId) {
    return this.request(`/financial/work-assets/${userId}`);
  }

  async updateWorkAsset(assetId, data) {
    return this.request(`/financial/work-asset/${assetId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteWorkAsset(assetId) {
    return this.request(`/financial/work-asset/${assetId}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();

