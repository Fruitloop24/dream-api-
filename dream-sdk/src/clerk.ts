/**
 * Dream API SDK - Clerk Integration
 *
 * Handles loading Clerk internally so devs never touch it.
 * Uses the shared end-user-api Clerk app.
 */

// End-user-api Clerk publishable key (shared across all devs)
const CLERK_PUBLISHABLE_KEY = 'pk_test_Y29tcG9zZWQtYmxvd2Zpc2gtNzYuY2xlcmsuYWNjb3VudHMuZGV2JA';
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
  };
  session?: {
    getToken: (options?: { template?: string }) => Promise<string>;
  };
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

export class ClerkManager {
  private loaded = false;
  private token: string | null = null;
  private onTokenChange?: (token: string | null) => void;

  constructor(onTokenChange?: (token: string | null) => void) {
    this.onTokenChange = onTokenChange;
  }

  /**
   * Load Clerk SDK (call once on page load)
   */
  async load(): Promise<void> {
    if (this.loaded || typeof window === 'undefined') return;

    // Check if already loaded
    const existingClerk = getClerk();
    if (existingClerk) {
      this.loaded = true;
      await this.checkSession();
      return;
    }

    // Load Clerk SDK dynamically
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CLERK_CDN_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Clerk SDK'));
      document.head.appendChild(script);
    });

    // Wait for Clerk to be available
    const clerk = getClerk();
    if (clerk) {
      await clerk.load();
    }
    this.loaded = true;

    // Check for existing session
    await this.checkSession();
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
    const clerk = getClerk();
    return !!clerk?.user && !!clerk?.session;
  }

  /**
   * Get current user info
   */
  getUser(): ClerkUser | null {
    const clerk = getClerk();
    if (!clerk?.user) return null;

    const user = clerk.user;
    const metadata = user.publicMetadata || {};

    // Get email - try primaryEmailAddress first, then fall back to emailAddresses array (for OAuth)
    const email = user.primaryEmailAddress?.emailAddress
      || user.emailAddresses?.[0]?.emailAddress
      || '';

    return {
      id: user.id,
      email,
      plan: (metadata.plan as string) || 'free',
      publishableKey: (metadata.publishableKey as string) || '',
    };
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Refresh token (call before API requests)
   */
  async refreshToken(): Promise<string | null> {
    const clerk = getClerk();
    if (!clerk?.session) return null;

    try {
      this.token = await clerk.session.getToken({ template: JWT_TEMPLATE });
      this.onTokenChange?.(this.token);
      return this.token;
    } catch (err) {
      console.error('Failed to refresh token:', err);
      return null;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const clerk = getClerk();
    if (!clerk) return;
    await clerk.signOut();
    this.token = null;
    this.onTokenChange?.(null);
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
