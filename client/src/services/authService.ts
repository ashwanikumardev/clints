import axios from 'axios';

// API Configuration for different environments
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative path in production (Vercel)
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

// Debug logging
console.log('🔧 Auth Service Debug Info:');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface UserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    isActive: boolean;
    lastLogin: string;
    createdAt: string;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Attempting login with:', { email, apiUrl: API_BASE_URL });
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Login error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw error;
    }
  },

  async register(name: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(data: { name?: string; avatar?: string }): Promise<UserResponse> {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};

export default api;
