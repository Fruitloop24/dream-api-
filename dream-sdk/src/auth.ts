/**
 * Dream API SDK - Auth Helpers
 *
 * URL builders for sign-up, sign-in, and account management flows.
 * All URLs point to dream-api's shared Clerk app (end-user-api).
 *
 * Also handles loading Clerk internally so devs never touch it.
 */

import { DreamClient } from './client';
import { ClerkManager, ClerkUser } from './clerk';

// Re-export for SDK users
export type { ClerkUser };

export interface AuthUrlOptions {
  /** URL to redirect to after auth completes */
  redirect: string;
}

export class AuthHelpers {
  private client: DreamClient;
  private clerk: ClerkManager;
  private initialized = false;

  constructor(client: DreamClient) {
    this.client = client;
    // Detect mode from publishable key prefix
    const pk = client.getPublishableKey();
    const mode: 'test' | 'live' = pk?.startsWith('pk_test_') ? 'test' : 'live';

    this.clerk = new ClerkManager(mode, (token) => {
      // Auto-set token on client when Clerk session changes
      if (token) {
        this.client.setUserToken(token);
      } else {
        this.client.clearUserToken();
      }
    });
  }

  /**
   * Initialize auth (loads Clerk internally).
   * Call this on page load to detect existing sessions.
   *
   * @example
   * ```typescript
   * await api.auth.init();
   * if (api.auth.isSignedIn()) {
   *   // User is signed in, token already set
   *   await api.usage.track();
   * }
   * ```
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.clerk.load();

    // Set up auto-refresh so tokens stay fresh before API calls
    this.client.setTokenRefresher(async () => {
      return await this.clerk.refreshToken();
    });

    this.initialized = true;
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.clerk.isSignedIn();
  }

  /**
   * Get current user info
   */
  getUser(): ClerkUser | null {
    return this.clerk.getUser();
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    await this.clerk.signOut();
  }

  /**
   * Refresh the auth token (call before long sessions)
   */
  async refreshToken(): Promise<void> {
    await this.clerk.refreshToken();
  }

  /**
   * Check if returning from auth redirect
   */
  static hasAuthParams(): boolean {
    return ClerkManager.hasAuthParams();
  }

  /**
   * Get the sign-up URL for new users.
   *
   * Redirects to the sign-up worker which handles user creation
   * and sets the required metadata (publishableKey, plan).
   *
   * @example
   * ```typescript
   * const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
   * // Returns: https://sign-up.../signup?pk=pk_xxx&redirect=...
   * window.location.href = signupUrl;
   * ```
   */
  getSignUpUrl(options: AuthUrlOptions): string {
    const pk = this.client.getPublishableKey();
    if (!pk) {
      throw new Error('DreamAPI: publishableKey required for auth URLs');
    }

    const baseUrl = this.client.getSignupBaseUrl();
    // Convert relative paths to absolute URLs so worker redirects to dev's app, not worker domain
    const redirectUrl = this.makeAbsoluteUrl(options.redirect);
    const params = new URLSearchParams({
      pk,
      redirect: redirectUrl,
    });

    return `${baseUrl}/signup?${params.toString()}`;
  }

  /**
   * Get the sign-in URL for returning users.
   *
   * Redirects to our auth worker which embeds Clerk. After sign-in,
   * users are redirected to your specified URL with JWT.
   *
   * @example
   * ```typescript
   * const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });
   * window.location.href = signinUrl;
   * ```
   */
  getSignInUrl(options: AuthUrlOptions): string {
    const pk = this.client.getPublishableKey();
    if (!pk) {
      throw new Error('DreamAPI: publishableKey required for auth URLs');
    }

    const baseUrl = this.client.getSignupBaseUrl();
    // Convert relative paths to absolute URLs so worker redirects to dev's app, not worker domain
    const redirectUrl = this.makeAbsoluteUrl(options.redirect);
    const params = new URLSearchParams({
      pk,
      redirect: redirectUrl,
    });

    return `${baseUrl}/signin?${params.toString()}`;
  }

  /**
   * Get the customer portal URL for account management.
   *
   * Redirects to our auth worker which embeds Clerk's UserProfile.
   * Users can manage their profile, password, and security settings.
   *
   * Note: This is separate from billing management.
   * For billing, use api.billing.openPortal().
   *
   * @example
   * ```typescript
   * const portalUrl = api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' });
   * window.location.href = portalUrl;
   * ```
   */
  getCustomerPortalUrl(options?: { returnUrl?: string }): string {
    const pk = this.client.getPublishableKey();
    if (!pk) {
      throw new Error('DreamAPI: publishableKey required for auth URLs');
    }

    const baseUrl = this.client.getSignupBaseUrl();
    const returnUrl = options?.returnUrl || (typeof window !== 'undefined' ? window.location.href : '/');
    // Convert relative paths to absolute URLs so worker redirects to dev's app, not worker domain
    const redirectUrl = this.makeAbsoluteUrl(returnUrl);
    const params = new URLSearchParams({
      pk,
      redirect: redirectUrl,
    });

    return `${baseUrl}/account?${params.toString()}`;
  }

  /**
   * Convert a relative path to an absolute URL using current origin.
   * Already-absolute URLs are returned unchanged.
   */
  private makeAbsoluteUrl(path: string): string {
    // Already absolute
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // In browser, prepend current origin
    if (typeof window !== 'undefined') {
      return new URL(path, window.location.origin).toString();
    }

    // Server-side: can't determine origin, return as-is (shouldn't happen in practice)
    return path;
  }
}
