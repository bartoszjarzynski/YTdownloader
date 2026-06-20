/**
 * Global authentication state.
 *
 * Exposes the current user plus auth actions to the whole component tree.
 * Screens consume this via the `useAuth()` hook and never talk to the
 * auth service directly, keeping UI and data concerns separated.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '@/services/authService';
import type { LoginInput, RegisterInput, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** True while restoring a persisted session on launch. */
  initializing: boolean;
  /** True while a login/register/logout request is in flight. */
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await authService.getSession();
      if (active) {
        setUser(session?.user ?? null);
        setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setLoading(true);
    try {
      const session = await authService.register(input);
      setUser(session.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setLoading(true);
    try {
      const session = await authService.login(input);
      setUser(session.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, loading, register, login, logout }),
    [user, initializing, loading, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
