import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'student' | 'technician';

interface AuthState {
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: AuthState | null;
  login: (role: UserRole, name?: string) => void;
  logout: () => void;
  updateProfile: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  const login = (role: UserRole, name?: string) => {
    setUser({ role, name: name || (role === 'technician' ? 'IT Technician' : 'Student') });
  };

  const logout = () => setUser(null);

  const updateProfile = (name: string) => {
    setUser((prev) => prev ? { ...prev, name } : null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
