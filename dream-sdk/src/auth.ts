/**
 * Dream API SDK - Auth Helpers
 *
 * URL builders for sign-up, sign-in, and account management flows.
 * All URLs point to dream-api's shared Clerk app (end-user-api).
 */

import { DreamClient } from './client';

export interface AuthUrlOptions {
  /** URL to redirect to after auth completes */
  redirect: string;
}

export class AuthHelpers {
  private client: DreamClient;

  constructor(client: DreamClient) {
    this.client = client;
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
