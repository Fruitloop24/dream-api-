'use client'

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

// Lazy initialization to avoid build-time errors
let _dreamAPI: DreamAPI | null = null;

function getDreamAPI(): DreamAPI {
  if (typeof window === 'undefined') {
    // During SSR/build, return a dummy that won't be used
    // The actual API calls only happen client-side
    throw new Error('DreamAPI should only be used client-side');
  }
  if (!_dreamAPI) {
    const key = process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error('NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY is required. Copy .env.example to .env.local and add your key.');
    }
    _dreamAPI = new DreamAPI({ publishableKey: key });
  }
  return _dreamAPI;
}

// Safe wrapper that returns empty string during SSR
function safeGetDreamAPI() {
  if (typeof window === 'undefined') return null;
  try {
    return getDreamAPI();
  } catch {
    return null;
  }
}

// Export for direct usage (sign-up URLs, etc.)
export const dreamAPI = {
  auth: {
    getSignUpUrl: (opts: { redirect: string }) => {
      const api = safeGetDreamAPI();
      return api ? api.auth.getSignUpUrl(opts) : '#';
    },
    getSignInUrl: (opts: { redirect: string }) => {
      const api = safeGetDreamAPI();
      return api ? api.auth.getSignInUrl(opts) : '#';
    },
    getCustomerPortalUrl: () => {
      const api = safeGetDreamAPI();
      return api ? api.auth.getCustomerPortalUrl() : '#';
    },
  },
  products: {
    listTiers: async () => {
      const api = safeGetDreamAPI();
      if (!api) return { tiers: [] };
      return api.products.listTiers();
    },
  },
};

interface DreamAPIContextType {
  api: DreamAPI;
  isReady: boolean;
  isSignedIn: boolean;
  user: ClerkUser | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<ClerkUser | null>;
}

const DreamAPIContext = createContext<DreamAPIContextType | undefined>(undefined);

export function DreamAPIProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<ClerkUser | null>(null);
  const [api, setApi] = useState<DreamAPI | null>(null);

  // Initialize SDK auth on mount (client-side only)
  useEffect(() => {
    async function initAuth() {
      try {
        const dreamApi = getDreamAPI();
        setApi(dreamApi);
        await dreamApi.auth.init();
        setIsSignedIn(dreamApi.auth.isSignedIn());
        setUser(dreamApi.auth.getUser());
        setIsReady(true);
      } catch (error) {
        console.error('[useDreamAPI] Failed to init auth:', error);
        setIsReady(true);
      }
    }
    initAuth();
  }, []);

  const signOut = async () => {
    if (!api) return;
    await api.auth.signOut();
    setIsSignedIn(false);
    setUser(null);
  };

  const refreshUser = async (): Promise<ClerkUser | null> => {
    if (!api) return null;
    await api.auth.refreshToken();
    const updatedUser = api.auth.getUser();
    setUser(updatedUser);
    return updatedUser;
  };

  // Create a proxy API that's safe before initialization
  const safeApi = api || ({} as DreamAPI);

  return (
    <DreamAPIContext.Provider value={{ api: safeApi, isReady, isSignedIn, user, signOut, refreshUser }}>
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
