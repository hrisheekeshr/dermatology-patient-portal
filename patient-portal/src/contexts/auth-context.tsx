'use client';

import React, { createContext, useContext, useState } from 'react';
import { Session } from '@/types';

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  email: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const signIn = async (email: string, _password: string) => {
    // Simple authentication - no persistence
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    const newSession: Session = {
      sessionId,
      email: email.toLowerCase().trim(),
      expiresAt,
    };

    setSession(newSession);
  };

  const signOut = () => {
    setSession(null);
  };

  const value: AuthContextType = {
    session,
    isAuthenticated: !!session,
    signIn,
    signOut,
    email: session?.email || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
