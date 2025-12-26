/**
 * Dream API SDK - Auth Helpers
 *
 * URL builders for sign-up and sign-in flows.
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
   * Redirect new users to this URL to create an account.
   * After sign-up, they'll be redirected to your specified URL.
   *
   * @example
   * ```typescript
   * const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
   * // Returns: https://sign-up.../signup?pk=pk_xxx&redirect=https://yourapp.com/dashboard
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
   * Uses Clerk's hosted sign-in page. After sign-in,
   * users are redirected to your specified URL.
   *
   * @example
   * ```typescript
   * const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });
   * ```
   */
  getSignInUrl(options: AuthUrlOptions): string {
    // Clerk hosted sign-in URL
    // Users should configure this via Clerk dashboard
    const params = new URLSearchParams({
      redirect_url: options.redirect,
    });

    // Default to Clerk's hosted sign-in
    // In practice, devs will use their Clerk instance
    return `https://accounts.clerk.dev/sign-in?${params.toString()}`;
  }
}
