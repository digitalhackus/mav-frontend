// Get API base URL from environment variable
// For production: Set VITE_API_BASE_URL in Vercel environment variables
// Example: VITE_API_BASE_URL=https://momentum-pos-production.up.railway.app
// For local development: Use http://localhost:5000
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Normalize the URL - ensure it has a protocol
if (API_BASE_URL && !API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://')) {
  // If no protocol, assume https for production URLs (Railway uses HTTPS)
  if (API_BASE_URL.includes('.railway.app') || API_BASE_URL.includes('.vercel.app') || import.meta.env.PROD) {
    API_BASE_URL = `https://${API_BASE_URL}`;
  } else {
    API_BASE_URL = `http://${API_BASE_URL}`;
  }
  console.warn('⚠️ API Base URL was missing protocol, added automatically:', API_BASE_URL);
}

// Remove trailing slash if present
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

// Log API URL for debugging (always, not just in dev)
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL || 'NOT SET - using fallback');

// Warn if using fallback in production
if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  console.error('⚠️ WARNING: VITE_API_BASE_URL is not set in Vercel environment variables!');
  console.error('⚠️ Using fallback localhost URL - this will NOT work in production!');
  console.error('⚠️ Go to Vercel → Settings → Environment Variables → Add VITE_API_BASE_URL');
}

// Token storage key - unified across the app
const TOKEN_KEY = 'mw_token';

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Set token in localStorage
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Remove token from localStorage (also clears refresh token)
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('mw_refreshToken');
};

// Check if token is expired or invalid
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return false; // If no expiration, assume valid
    
    // Check if token is expired (with 5 second buffer)
    return Date.now() >= (exp * 1000) - 5000;
  } catch {
    return true; // If we can't parse, assume invalid
  }
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;
  const isAuthCheck = url.includes('/api/auth/me') || url.includes('/api/auth/login') || url.includes('/api/auth/signup');

  // Log the full URL being called (for debugging)
  console.log('📡 API Request:', options.method || 'GET', url);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // For /api/auth/me, we need to send the token if it exists (to verify auth)
  // For other auth endpoints (login, signup), we don't send token
  const isAuthMeEndpoint = url.includes('/api/auth/me');
  
  // Add token to headers
  if (token) {
    // For /api/auth/me, always send token if available (let server validate)
    if (isAuthMeEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (!isAuthCheck) {
      // For non-auth endpoints, validate token before sending
      if (isTokenExpired(token)) {
        // Token is expired, remove it and throw error
        removeToken();
        const error = new Error('Session expired, please log in again');
        (error as any).status = 401;
        (error as any).isAuthError = true;
        (error as any).isTokenExpired = true;
        throw error;
      }
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else if (!isAuthCheck && !isAuthMeEndpoint) {
    // For non-auth endpoints, token is required
    const error = new Error('Session expired, please log in again');
    (error as any).status = 401;
    (error as any).isAuthError = true;
    (error as any).isTokenMissing = true;
    throw error;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Log response status (skip 401 for auth checks - it's expected when not logged in)
    if (!isAuthCheck || response.status !== 401) {
      console.log('📡 API Response:', response.status, response.statusText, 'for', url);
    }

    if (!response.ok) {
      // Handle 401 Unauthorized errors
      if (response.status === 401) {
        // Remove invalid token
        if (!isAuthCheck) {
          removeToken();
        }
        
        const error = new Error('Session expired, please log in again');
        (error as any).status = 401;
        (error as any).isAuthError = true;
        
        // Try to get error message from response
        try {
          const errorData = await response.json();
          if (errorData.message || errorData.error) {
            (error as any).message = errorData.message || errorData.error;
          }
        } catch {
          // If response is not JSON, use default message
        }
        
        throw error;
      }
      
      // Handle other errors
      const errorData = await response.json().catch(() => ({ 
        error: 'An error occurred',
        message: `HTTP ${response.status}: ${response.statusText}`
      }));
      
      const error = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  } catch (error: any) {
    // Don't log 401 errors for auth checks - they're expected when not logged in
    if (error.isAuthError && error.status === 401 && isAuthCheck) {
      throw error; // Re-throw silently for auth endpoints
    }
    
    // Enhanced error logging
    console.error('❌ API Request Failed:', {
      url,
      method: options.method || 'GET',
      error: error.message,
      status: error.status,
      isAuthError: error.isAuthError,
      isNetworkError: error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
    });
    
    // Provide more helpful error messages for network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      if (API_BASE_URL.includes('localhost')) {
        throw new Error('Cannot connect to backend. VITE_API_BASE_URL is not set in Vercel. Please configure it in Vercel → Settings → Environment Variables.');
      } else {
        throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Please check if the backend is running.`);
      }
    }
    
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{ success: boolean; accessToken?: string; refreshToken?: string; user?: any; error?: string; requiresVerification?: boolean; userId?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    // Note: Token storage is handled by AuthContext.login() - don't duplicate here
    // Only store refreshToken at API level for token refresh mechanics
    if (data.success && data.refreshToken) {
      localStorage.setItem('mw_refreshToken', data.refreshToken);
    }
    return data;
  },

  signup: async (name: string, email: string, password: string, role?: string) => {
    const data = await apiRequest<{ success: boolean; user?: any; error?: string; message?: string }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }
    );
    return data;
  },

  verifyEmail: async (userId: string, otp: string) => {
    return apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/api/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ userId, otp }),
      }
    );
  },

  sendVerificationOTP: async (email: string) => {
    return apiRequest<{ success: boolean; message?: string; error?: string; userId?: string }>(
      '/api/auth/send-verification-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  },

  forgotPassword: async (email: string) => {
    return apiRequest<{ success: boolean; message?: string; error?: string; userId?: string }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  },

  resetPassword: async (userId: string, otp: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/api/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ userId, otp, newPassword }),
      }
    );
  },

  deleteUser: async () => {
    return apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/api/auth/delete-me',
      {
        method: 'DELETE',
      }
    );
  },

  getMe: async () => {
    return apiRequest<{ success: boolean; user: any; error?: string }>('/api/auth/me');
  },
};

// Customers API
export const customersAPI = {
  getAll: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/customers${query}`
    );
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/customers/${id}`);
  },

  create: async (customerData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/customers',
      {
        method: 'POST',
        body: JSON.stringify(customerData),
      }
    );
  },

  update: async (id: string, customerData: Partial<{
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/customers/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(customerData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/customers/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Jobs API
export const jobsAPI = {
  getAll: async (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/jobs${query}`
    );
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/jobs/${id}`);
  },

  create: async (jobData: {
    customer: string;
    vehicle: {
      make: string;
      model: string;
      year?: number;
      plateNo?: string;
    };
    title: string;
    description?: string;
    status?: string;
    technician?: string;
    estimatedTimeHours?: number;
    amount?: number;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/jobs',
      {
        method: 'POST',
        body: JSON.stringify(jobData),
      }
    );
  },

  update: async (id: string, jobData: Partial<{
    vehicle: any;
    title: string;
    description?: string;
    status?: string;
    technician?: string;
    estimatedTimeHours?: number;
    amount?: number;
    services?: any[];
    notes?: string;
    overallServiceComment?: string;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/jobs/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(jobData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/jobs/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        todayJobs: number;
        jobsByStatus: {
          PENDING: number;
          IN_PROGRESS: number;
          COMPLETED: number;
          DELIVERED: number;
        };
        totalCustomers: number;
        todayRevenue: number;
      };
    }>('/api/dashboard/summary');
  },
};

// Vehicles API
export const vehiclesAPI = {
  getAll: async (search?: string, customer?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (customer) params.append('customer', customer);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/vehicles${query}`
    );
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/vehicles/${id}`);
  },

  create: async (vehicleData: {
    customer: string;
    make: string;
    model: string;
    year: number;
    plateNo: string;
    mileage?: number;
    lastService?: string;
    nextService?: string;
    oilType?: string;
    status?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/vehicles',
      {
        method: 'POST',
        body: JSON.stringify(vehicleData),
      }
    );
  },

  update: async (id: string, vehicleData: Partial<{
    make: string;
    model: string;
    year: number;
    plateNo: string;
    mileage?: number;
    lastService?: string;
    nextService?: string;
    oilType?: string;
    status?: string;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/vehicles/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(vehicleData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/vehicles/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Service History API
export const serviceHistoryAPI = {
  getAll: async (vehicle?: string, customer?: string) => {
    const params = new URLSearchParams();
    if (vehicle) params.append('vehicle', vehicle);
    if (customer) params.append('customer', customer);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/service-history${query}`
    );
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/service-history/${id}`);
  },

  create: async (serviceData: {
    vehicle: string;
    customer: string;
    job?: string;
    serviceDate?: string;
    description: string;
    cost: number;
    technician?: string;
    mileage?: number;
    notes?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/service-history',
      {
        method: 'POST',
        body: JSON.stringify(serviceData),
      }
    );
  },

  update: async (id: string, serviceData: Partial<{
    serviceDate?: string;
    description?: string;
    cost?: number;
    technician?: string;
    mileage?: number;
    notes?: string;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/service-history/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(serviceData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/service-history/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async (search?: string, status?: string, customer?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (customer) params.append('customer', customer);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/invoices${query}`
    );
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/invoices/${id}`);
  },

  create: async (invoiceData: {
    customer: string;
    job?: string;
    date?: string;
    vehicle?: {
      make: string;
      model: string;
      year?: number;
      plateNo?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      price: number;
    }>;
    subtotal?: number;
    tax?: number;
    discount?: number;
    amount?: number;
    status?: string;
    paymentMethod?: string;
    technician?: string;
    supervisor?: string;
    notes?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/invoices',
      {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      }
    );
  },

  update: async (id: string, invoiceData: Partial<{
    date?: string;
    vehicle?: any;
    items?: Array<{
      description: string;
      quantity: number;
      price: number;
    }>;
    subtotal?: number;
    tax?: number;
    discount?: number;
    amount?: number;
    status?: string;
    paymentMethod?: string;
    technician?: string;
    supervisor?: string;
    notes?: string;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/invoices/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(invoiceData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/invoices/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Reports API
export const reportsAPI = {
  getFinancialOverview: async (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return apiRequest<{ success: boolean; data: any }>(
      `/api/reports/financial-overview${query}`
    );
  },

  getRevenueTrend: async (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return apiRequest<{ success: boolean; data: any[] }>(
      `/api/reports/revenue-trend${query}`
    );
  },

  getPaymentMethods: async (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return apiRequest<{ success: boolean; data: any[] }>(
      `/api/reports/payment-methods${query}`
    );
  },

  getPopularServices: async (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return apiRequest<{ success: boolean; data: any[] }>(
      `/api/reports/popular-services${query}`
    );
  },

  getDailyPerformance: async (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiRequest<{ success: boolean; data: any[] }>(
      `/api/reports/daily-performance${query}`
    );
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return apiRequest<{ success: boolean; data: any[] }>(
      '/api/notifications'
    );
  },

  getStats: async () => {
    return apiRequest<{ success: boolean; data: any }>(
      '/api/notifications/stats'
    );
  },

  getServiceReminders: async () => {
    return apiRequest<{ success: boolean; data: any[] }>(
      '/api/notifications/service-reminders'
    );
  },

  getHistory: async (customerId?: string, vehicleId?: string) => {
    const params = new URLSearchParams();
    if (customerId) params.append('customer', customerId);
    if (vehicleId) params.append('vehicle', vehicleId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/notifications/history${query}`
    );
  },

  sendEmail: async (customerId: string, vehicleId: string, notificationId?: string) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/notifications/send-email',
      {
        method: 'POST',
        body: JSON.stringify({ customerId, vehicleId, notificationId }),
      }
    );
  },

  sendWhatsApp: async (customerId: string, vehicleId: string, notificationId?: string) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/notifications/send-whatsapp',
      {
        method: 'POST',
        body: JSON.stringify({ customerId, vehicleId, notificationId }),
      }
    );
  },

  createCustom: async (customerId: string, title: string, message: string, method: 'email' | 'whatsapp' | 'both', vehicleId?: string) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/notifications/custom',
      {
        method: 'POST',
        body: JSON.stringify({ customerId, vehicleId, title, message, method }),
      }
    );
  },

  sendBulk: async (type: 'all' | 'overdue' | 'due_soon', method: 'email' | 'whatsapp' | 'both') => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/notifications/send-bulk',
      {
        method: 'POST',
        body: JSON.stringify({ type, method }),
      }
    );
  },
};

// Comments API
export const commentsAPI = {
  getByJob: async (jobId: string) => {
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      `/api/comments/job/${jobId}`
    );
  },

  create: async (commentData: {
    job: string;
    author: string;
    authorInitials: string;
    role: string;
    text: string;
    attachments?: Array<{ name: string; type: string; url?: string }>;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/comments',
      {
        method: 'POST',
        body: JSON.stringify(commentData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/comments/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Catalog API
export const catalogAPI = {
  getAll: async () => {
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      '/api/catalog'
    );
  },

  getByType: async (type: 'service' | 'product') => {
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      `/api/catalog/type/${type}`
    );
  },

  create: async (itemData: {
    name: string;
    type: 'service' | 'product';
    description?: string;
    cost: number;
    estimatedTime?: string;
    quantity?: number;
    unit?: string;
    visibility?: 'default' | 'local';
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/catalog',
      {
        method: 'POST',
        body: JSON.stringify(itemData),
      }
    );
  },

  update: async (id: string, itemData: Partial<{
    name: string;
    type: 'service' | 'product';
    description?: string;
    cost: number;
    estimatedTime?: string;
    quantity?: number;
    unit?: string;
    isActive?: boolean;
  }>) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      `/api/catalog/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(itemData),
      }
    );
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/catalog/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    return apiRequest<{ success: boolean; data: any }>('/api/settings');
  },

  update: async (settings: {
    workshop?: any;
    tax?: any;
    notifications?: any;
    email?: any;
    security?: any;
    advanced?: any;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );
  },

  updatePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return apiRequest<{ success: boolean; message: string }>(
      '/api/settings/password',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  connectEmail: async (provider: 'smtp' | 'google' | 'outlook', credentials?: any) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      '/api/settings/email/connect',
      {
        method: 'POST',
        body: JSON.stringify({ provider, credentials }),
      }
    );
  },
};
