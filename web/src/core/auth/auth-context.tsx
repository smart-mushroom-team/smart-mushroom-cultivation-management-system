import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, ApiError, connection, type ConnectionState } from '../api/api-client';
import type { User } from '../../types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  connectionState: ConnectionState;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(connection.state);

  useEffect(() => {
    const unsubscribe = connection.subscribe(setConnectionState);
    apiClient
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      connectionState,
      async login(email, password) {
        const result = await apiClient.login(email, password);
        if (result.user.role !== 'ADMIN' && result.user.role !== 'OPERATOR') {
          throw new ApiError(
            403,
            'FORBIDDEN',
            'Tai khoan nay khong duoc phep su dung web quan tri.',
          );
        }
        setUser(result.user);
      },
      async logout() {
        try {
          await apiClient.logout();
        } finally {
          setUser(null);
        }
      },
    }),
    [user, isLoading, connectionState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
