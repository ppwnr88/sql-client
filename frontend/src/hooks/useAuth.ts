import { useState, useCallback, useEffect } from 'react';
import { login as apiLogin } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
}

interface UseAuthReturn extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('jwt_token');
    const username = localStorage.getItem('auth_username');
    return {
      isAuthenticated: token !== null,
      username,
      isLoading: false,
    };
  });

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setState((prev) => ({ ...prev, isAuthenticated: false, username: null }));
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { token } = await apiLogin(username, password);
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('auth_username', username);
      setState({ isAuthenticated: true, username, isLoading: false });
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback((): void => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_username');
    setState({ isAuthenticated: false, username: null, isLoading: false });
  }, []);

  return { ...state, login, logout };
}
