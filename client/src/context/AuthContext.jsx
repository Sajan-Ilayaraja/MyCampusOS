import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Check user validation state on initial load
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await API.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          // Token is invalid/expired
          handleLogoutCleanup();
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        handleLogoutCleanup();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const handleLogoutCleanup = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Register user action
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const response = await API.post('/auth/register', { name, email, password });
      
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
        toast.success(`Welcome, ${userData.name}! Account created.`);
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Try again.';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Login user action
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await API.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
        toast.success(`Welcome back, ${userData.name}!`);
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid email or password';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = () => {
    handleLogoutCleanup();
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!user,
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
