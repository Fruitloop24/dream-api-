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
    this.clerk = new ClerkManager((token) => {
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
    const params = new URLSearchParams({
      pk,
      redirect: options.redirect,
    });

    return `${baseUrl}/signup?${params.toString()}`;
  }

  /**
   * Get the sign-in URL for returning users.
   *
   * Redirects to Clerk's hosted sign-in page. After sign-in,
   * users are redirected to your specified URL.
   *
   * @example
   * ```typescript
   * const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });
   * window.location.href = signinUrl;
   * ```
   */
  getSignInUrl(options: AuthUrlOptions): string {
    const clerkBaseUrl = this.client.getClerkBaseUrl();
    return `${clerkBaseUrl}/sign-in?redirect_url=${encodeURIComponent(options.redirect)}`;
  }

  /**
   * Get the customer portal URL for account management.
   *
   * Redirects to Clerk's hosted account page where users can
   * manage their profile, password, and security settings.
   *
   * Note: This is separate from billing management.
   * For billing, use api.billing.openPortal().
   *
   * @example
   * ```typescript
   * const portalUrl = api.auth.getCustomerPortalUrl();
   * window.location.href = portalUrl;
   * ```
   */
  getCustomerPortalUrl(): string {
    const clerkBaseUrl = this.client.getClerkBaseUrl();
    return `${clerkBaseUrl}/user`;
  }
}
