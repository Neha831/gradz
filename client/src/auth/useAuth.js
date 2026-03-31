import { useCallback, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

function userFromJwt(raw) {
  if (!raw) return null;
  try {
    const decoded = jwtDecode(raw);
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name || '',
      domain: decoded.domain || ''
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => userFromJwt(localStorage.getItem('token') || ''));

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const next = userFromJwt(token);
    if (!next) {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
      return;
    }
    setUser(next);
  }, [token]);

  const signIn = useCallback((newToken) => {
    const raw = String(newToken || '').trim();
    if (!raw) {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
      return false;
    }
    const next = userFromJwt(raw);
    if (!next) {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
      return false;
    }
    localStorage.setItem('token', raw);
    setToken(raw);
    setUser(next);
    return true;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  }, []);

  const auth = useMemo(
    () => ({
      token,
      user,
      signIn,
      signOut
    }),
    [token, user, signIn, signOut]
  );

  return auth;
}

