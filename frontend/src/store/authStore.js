// Simple localStorage-based auth state
export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};
export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
export const isAuthenticated = () => !!getToken();
