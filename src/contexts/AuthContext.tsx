import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Supervisor" | "Technician";
  status?: "pending" | "active" | "blocked";
  [key: string]: any; // Allow additional user properties
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  authReady: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// LocalStorage keys
const TOKEN_KEY = 'mw_token';
const USER_KEY = 'mw_user';

// Get API base URL from environment
const getApiBaseUrl = () => {
  // For local development: Use empty string to use Vite proxy (which forwards to http://localhost:5000)
  let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:5000');
  if (apiBaseUrl && !apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
    if (apiBaseUrl.includes('.railway.app') || apiBaseUrl.includes('.vercel.app') || import.meta.env.PROD) {
      apiBaseUrl = `https://${apiBaseUrl}`;
    } else {
      apiBaseUrl = `http://${apiBaseUrl}`;
    }
  }
  return apiBaseUrl.replace(/\/$/, '');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Called after successful login
  const login = (newToken: string, newUser: User) => {
    setTokenState(newToken);
    setUser(newUser);
    // Save to localStorage
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);
    // Remove from localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // Refresh auth state (useful when tab becomes visible)
  const refreshAuth = async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        setTokenState(storedToken);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } else {
          logout();
        }
      } else if (response.status === 401 || response.status === 403) {
        logout();
      }
    } catch (err: any) {
      // Only logout on actual auth errors (401/403), not network errors
      if (err?.status === 401 || err?.status === 403) {
        logout();
      }
      // Otherwise, keep current state (don't logout on network errors)
    }
  };

  // Restore auth on mount
  useEffect(() => {
    const restoreAuth = async () => {
      // Read from localStorage
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      // If no token, set authReady and return
      if (!storedToken) {
        setAuthReady(true);
        return;
      }

      // Set token state
      setTokenState(storedToken);

      // Call GET /api/auth/me with Authorization header
        try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Set user from returned data
            setUser(data.user);
            // Update mw_user in localStorage
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
            // Response not OK - logout
            logout();
          }
        } else if (response.status === 401 || response.status === 403) {
          // Auth error - logout
          logout();
        } else {
          // Other error - logout
          logout();
        }
      } catch (err: any) {
        // Network error or other error - logout
        console.warn('Auth validation failed:', err.message);
          logout();
      } finally {
        // Always set authReady at the end
        setAuthReady(true);
      }
    };

    restoreAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, authReady, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

