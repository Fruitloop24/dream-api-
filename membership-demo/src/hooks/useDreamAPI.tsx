/**
 * ============================================================================
 * DREAM API HOOK - SDK Integration
 * ============================================================================
 *
 * Provides DreamAPI SDK instance with auth state.
 * SDK handles Clerk internally - devs never touch Clerk directly.
 *
 * USAGE:
 *   const { api, isReady, isSignedIn, user } = useDreamAPI();
 *
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DreamAPI, type ClerkUser } from '@dream-api/sdk';

// Initialize SDK with publishable key only (frontend-safe mode)
// Secret key should NEVER be in frontend code - it stays on your backend
const dreamAPI = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

interface DreamAPIContextType {
  api: DreamAPI;
  isReady: boolean;
  isSignedIn: boolean;
  user: ClerkUser | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const DreamAPIContext = createContext<DreamAPIContextType | undefined>(undefined);

export function DreamAPIProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<ClerkUser | null>(null);

  // Initialize SDK auth on mount
  useEffect(() => {
    async function initAuth() {
      try {
        await dreamAPI.auth.init();
        setIsSignedIn(dreamAPI.auth.isSignedIn());
        setUser(dreamAPI.auth.getUser());
        setIsReady(true);
      } catch (error) {
        console.error('Failed to init auth:', error);
        setIsReady(true); // Still ready, just not signed in
      }
    }
    initAuth();
  }, []);

  const signOut = async () => {
    await dreamAPI.auth.signOut();
    setIsSignedIn(false);
    setUser(null);
  };

  const refreshUser = async () => {
    await dreamAPI.auth.refreshToken();
    setUser(dreamAPI.auth.getUser());
  };

  return (
    <DreamAPIContext.Provider value={{ api: dreamAPI, isReady, isSignedIn, user, signOut, refreshUser }}>
      {children}
    </DreamAPIContext.Provider>
  );
}

export function useDreamAPI(): DreamAPIContextType {
  const context = useContext(DreamAPIContext);
  if (context === undefined) {
    throw new Error('useDreamAPI must be used within a DreamAPIProvider');
  }
  return context;
}

// Export raw API for unauthenticated calls (tiers, products)
export { dreamAPI };
