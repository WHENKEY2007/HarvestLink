/**
 * HarvestLink AI - Reusable API Service Layer
 * Encapsulates backend REST communication, automatic Firebase ID token retrieval, header attachment,
 * and standard error parsing.
 */

class ApiService {
  constructor() {
    this.baseUrl = window.HARVESTLINK_API_BASE_URL || 'http://localhost:5000/api';
  }

  /**
   * Helper to retrieve current Firebase ID Token if user is logged in
   */
  async getAuthToken() {
    try {
      if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
        return await window.firebase.auth().currentUser.getIdToken();
      }
    } catch (err) {
      console.warn('[ApiService] Could not retrieve Firebase ID token:', err.message);
    }
    return null;
  }

  /**
   * Core request method
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP Error ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        const netErr = new Error('Unable to connect to HarvestLink backend server. Please make sure the server is running on http://localhost:5000.');
        netErr.status = 0;
        throw netErr;
      }
      throw error;
    }
  }

  // HTTP Method Short-cuts
  async get(endpoint, params = {}) {
    let url = endpoint;
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// Attach globally
window.ApiService = new ApiService();
