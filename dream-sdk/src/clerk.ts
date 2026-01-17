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

    // Wait for Clerk to be available on window (script loaded but needs init time)
    let clerk: ClerkInstance | undefined;
    for (let i = 0; i < 50; i++) {
      clerk = getClerk();
      if (clerk) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (clerk) {
      await clerk.load();

      // Handle __clerk_ticket from sign-up redirect
      const urlParams = new URLSearchParams(window.location.search);
      const ticket = urlParams.get('__clerk_ticket');

      console.log('[DreamAPI] URL:', window.location.href);
      console.log('[DreamAPI] Ticket present:', ticket ? 'YES' : 'NO');

      // Debug: Log to localStorage for debugging
      const sdkDebug: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        hasTicket: !!ticket,
        ticketLength: ticket ? ticket.length : 0,
        signupDebug: localStorage.getItem('dream_signup_debug'),
        signupRedirect: localStorage.getItem('dream_signup_redirect')
      };
      localStorage.setItem('dream_sdk_debug', JSON.stringify(sdkDebug));

      // Wait for signIn to be available (Clerk might still be initializing)
      // Try both clerk.signIn and clerk.client.signIn (Clerk versions differ)
      if (ticket) {
        for (let i = 0; i < 50; i++) {
          const hasSignIn = clerk.signIn || clerk.client?.signIn;
          if (hasSignIn && clerk.setActive) break;
          await new Promise(r => setTimeout(r, 100));
        }
        console.log('[DreamAPI] signIn available:', !!clerk.signIn, 'client.signIn:', !!clerk.client?.signIn, 'setActive:', !!clerk.setActive);
      }

      // Get signIn from either location
      const signInObj = clerk.signIn || clerk.client?.signIn;

      if (ticket && signInObj && clerk.setActive) {
        console.log('[DreamAPI] Consuming ticket...');
        try {
          const result = await signInObj.create({ strategy: 'ticket', ticket });
          console.log('[DreamAPI] Ticket result:', result.status, result.createdSessionId);

          if (result.status === 'complete' && result.createdSessionId) {
            await clerk.setActive({ session: result.createdSessionId });
            console.log('[DreamAPI] Session activated!');

            // Wait for session to fully hydrate
            for (let i = 0; i < 20; i++) {
              await new Promise(r => setTimeout(r, 100));
              if (clerk.user && clerk.session) break;
            }
            console.log('[DreamAPI] User hydrated:', !!clerk.user);

            // Only clean URL AFTER successful sign-in
            urlParams.delete('__clerk_ticket');
            const newUrl = urlParams.toString()
              ? `${window.location.pathname}?${urlParams}`
              : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
        } catch (err: any) {
          console.error('[DreamAPI] Ticket error:', err?.message, err);
          // Don't clean URL on error - let user see what happened
        }
      } else if (ticket) {
        console.error('[DreamAPI] FAILED to get signIn object! Ticket NOT consumed.');
        console.log('[DreamAPI] clerk keys:', Object.keys(clerk));
      }
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

    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
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
   * Refresh token and user data from Clerk server
   * Call after plan changes (checkout success) to get updated metadata
   */
  async refreshToken(): Promise<string | null> {
    const clerk = getClerk();
    if (!clerk?.session) return null;

    try {
      // Reload user data from Clerk server (gets updated publicMetadata after webhook)
      if (clerk.user?.reload) {
        await clerk.user.reload();
      }

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
