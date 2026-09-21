import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminService } from '../api/adminService';
import { getStoredTokens, setStoredTokens, clearStoredTokens } from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load from storage
    const stored = getStoredTokens();
    if (stored.token && stored.user) {
      if (stored.user.role?.toLowerCase() === 'admin') {
        setUser(stored.user);
        setToken(stored.token);
        setRefreshToken(stored.refreshToken);
      } else {
        clearStoredTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password, rememberMe = true) => {
    const data = await adminService.login(email, password, rememberMe);
    const { token: newAccessToken, refreshToken: newRefreshToken, user: loggedUser } = data;

    // Check if user is Admin
    if (loggedUser.role?.toLowerCase() !== 'admin') {
      throw new Error('Yetkisiz Giriş: Bu yönetim paneline yalnızca Yönetici (Admin) rolündeki kullanıcılar erişebilir.');
    }

    setStoredTokens({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: loggedUser,
      rememberMe,
    });

    setUser(loggedUser);
    setToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    return loggedUser;
  };

  const logout = async () => {
    if (refreshToken) {
      await adminService.logout(refreshToken);
    }
    clearStoredTokens();
    setUser(null);
    setToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && user.role?.toLowerCase() === 'admin',
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
