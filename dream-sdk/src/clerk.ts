/**
 * Dream API SDK - Clerk Integration
 *
 * Handles loading Clerk internally so devs never touch it.
 * Uses the shared end-user-api Clerk app.
 *
 * Auto-detects localhost vs production and uses appropriate keys.
 */

// End-user-api Clerk keys (shared across all devs)
// Test: composed-blowfish-76.clerk.accounts.dev (for pk_test_ keys)
// Live: users.panacea-tech.net (for pk_live_ keys)
const CLERK_TEST_KEY = 'pk_test_Y29tcG9zZWQtYmxvd2Zpc2gtNzYuY2xlcmsuYWNjb3VudHMuZGV2JA';
const CLERK_LIVE_KEY = 'pk_live_Y2xlcmsudXNlcnMucGFuYWNlYS10ZWNoLm5ldCQ';

// Select Clerk key based on Dream API publishable key mode
// pk_test_xxx → test Clerk (test users, test payments)
// pk_live_xxx → live Clerk (real users, real payments)
function getClerkKey(mode: 'test' | 'live'): string {
  return mode === 'test' ? CLERK_TEST_KEY : CLERK_LIVE_KEY;
}

// Pin to specific version to avoid breaking changes from Clerk updates
const CLERK_CDN_URL = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5.118.0/dist/clerk.browser.js';
const JWT_TEMPLATE = 'end-user-api';

// Clerk type (loaded dynamically from CDN)
interface ClerkInstance {
  load: () => Promise<void>;
  user?: {
    id: string;
    primaryEmailAddress?: { emailAddress: string };
    emailAddresses?: Array<{ emailAddress: string }>;
    publicMetadata?: Record<string, unknown>;
    reload?: () => Promise<void>;
  };
  session?: {
    getToken: (options?: { template?: string }) => Promise<string>;
  };
  signIn?: {
    create: (params: { strategy: string; ticket: string }) => Promise<{ status: string; createdSessionId?: string }>;
  };
  client?: {
    signIn?: {
      create: (params: { strategy: string; ticket: string }) => Promise<{ status: string; createdSessionId?: string }>;
    };
  };
  setActive?: (params: { session: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

// Get Clerk from window (may be undefined before load)
function getClerk(): ClerkInstance | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Clerk as ClerkInstance | undefined;
}

export interface ClerkUser {
  id: string;
  email: string;
  plan: string;
  publishableKey: string;
}

// localStorage key for persisting JWT
const STORAGE_KEY = 'dream_api_jwt';

export class ClerkManager {
  private loaded = false;
  private token: string | null = null;
  private onTokenChange?: (token: string | null) => void;
  private mode: 'test' | 'live';

  constructor(mode: 'test' | 'live', onTokenChange?: (token: string | null) => void) {
    this.mode = mode;
    this.onTokenChange = onTokenChange;
  }

  /**
   * Load auth (call once on page load)
   * Uses JWT from URL or localStorage - no Clerk needed on dev's domain
   */
  async load(): Promise<void> {
    if (this.loaded || typeof window === 'undefined') return;

    // 1. Check for JWT from sign-up worker redirect
    const urlParams = new URLSearchParams(window.location.search);
    const jwt = urlParams.get('__clerk_jwt');

    if (jwt) {
      console.log('[DreamAPI] JWT received from auth worker');
      this.setToken(jwt);

      // Clean URL
      urlParams.delete('__clerk_jwt');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      this.loaded = true;
      return;
    }

    // 2. Check localStorage for existing JWT
    const storedJwt = localStorage.getItem(STORAGE_KEY);
    if (storedJwt) {
      // Verify JWT isn't expired (Clerk JWTs have exp claim)
      try {
        const payload = JSON.parse(atob(storedJwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now) {
          console.log('[DreamAPI] Valid JWT from localStorage');
          this.token = storedJwt;
          this.onTokenChange?.(storedJwt);
          this.loaded = true;
          return;
        } else {
          console.log('[DreamAPI] Stored JWT expired, clearing');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.log('[DreamAPI] Invalid stored JWT, clearing');
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // 3. For TEST mode only, try loading Clerk (more permissive with domains)
    if (this.mode === 'test') {
      try {
        await this.loadClerkSDK();
      } catch (e) {
        console.log('[DreamAPI] Clerk load failed (expected in some environments)');
      }
    }

    // 4. No JWT and no Clerk = not signed in (that's fine)
    this.loaded = true;
  }

  /**
   * Load Clerk SDK (test mode only, for better DX on localhost)
   */
  private async loadClerkSDK(): Promise<void> {
    const existingClerk = getClerk();
    if (existingClerk) {
      await this.checkSession();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CLERK_CDN_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-clerk-publishable-key', getClerkKey(this.mode));
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Clerk SDK'));
      document.head.appendChild(script);
    });

    // Wait for Clerk to be available
    let clerk: ClerkInstance | undefined;
    for (let i = 0; i < 50; i++) {
      clerk = getClerk();
      if (clerk) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (clerk) {
      await clerk.load();
      // Check for existing session (test mode convenience)
      await this.checkSession();
    }
  }

  /**
   * Store JWT in memory and localStorage
   */
  private setToken(jwt: string): void {
    this.token = jwt;
    localStorage.setItem(STORAGE_KEY, jwt);
    this.onTokenChange?.(jwt);
  }

  /**
   * Check if returning from auth and grab token
   */
  private async checkSession(): Promise<void> {
    const clerk = getClerk();
    if (!clerk?.session || !clerk?.user) {
      return;
    }

    try {
      this.token = await clerk.session.getToken({ template: JWT_TEMPLATE });
      this.onTokenChange?.(this.token);
    } catch (err) {
      console.error('Failed to get Clerk token:', err);
    }
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    // If we have a JWT (from sign-up worker), user is signed in
    if (this.token) return true;
    // Otherwise check Clerk
    const clerk = getClerk();
    return !!clerk?.user && !!clerk?.session;
  }

  /**
   * Get current user info
   */
  getUser(): ClerkUser | null {
    // ALWAYS prefer Clerk's live user data (has fresh metadata after webhook updates)
    const clerk = getClerk();
    if (clerk?.user) {
      const user = clerk.user;
      const metadata = user.publicMetadata || {};
      return {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        plan: (metadata.plan as string) || 'free',
        publishableKey: (metadata.publishableKey as string) || '',
      };
    }

    // Fallback: decode JWT if no Clerk session (edge case)
    if (this.token) {
      try {
        const parts = this.token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          return {
            id: payload.sub || '',
            email: payload.email || '',
            plan: payload.plan || payload.publicMetadata?.plan || 'free',
            publishableKey: payload.publishableKey || payload.publicMetadata?.publishableKey || '',
          };
        }
      } catch (e) {
        console.error('[DreamAPI] Failed to decode JWT:', e);
      }
    }

    return null;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Refresh token and user data
   * In test mode: refreshes from Clerk session
   * In live mode: returns current token (re-auth needed for fresh data)
   */
  async refreshToken(): Promise<string | null> {
    // Try Clerk first (test mode)
    const clerk = getClerk();
    if (clerk?.session) {
      try {
        if (clerk.user?.reload) {
          await clerk.user.reload();
        }
        this.token = await clerk.session.getToken({ template: JWT_TEMPLATE });
        this.setToken(this.token);
        return this.token;
      } catch (err) {
        console.error('Failed to refresh token from Clerk:', err);
      }
    }

    // In live mode (JWT-only), return current token
    // User needs to re-auth via sign-up worker for fresh metadata
    return this.token;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    // Clear JWT from localStorage
    localStorage.removeItem(STORAGE_KEY);
    this.token = null;
    this.onTokenChange?.(null);

    // Also sign out of Clerk if loaded (test mode)
    const clerk = getClerk();
    if (clerk) {
      try {
        await clerk.signOut();
      } catch (e) {
        // Clerk may not be loaded in live mode
      }
    }
  }

  /**
   * Check if we're returning from auth (has clerk params/cookies)
   */
  static hasAuthParams(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.location.search.includes('__clerk') ||
      document.cookie.includes('__clerk') ||
      document.cookie.includes('__session')
    );
  }
}
