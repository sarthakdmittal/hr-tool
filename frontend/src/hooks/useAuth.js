import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser, setAuth, clearAuth, isAuthenticated } from '../store/authStore';
import api from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(getUser);
  const [token, setToken] = useState(getToken);
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    setAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
    return response.data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };
}
