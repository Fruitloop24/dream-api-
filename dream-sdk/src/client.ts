/**
 * Dream API SDK - HTTP Client
 *
 * Handles all HTTP communication with the Dream API.
 * Automatically injects authentication headers.
 *
 * Auto-detects localhost vs production for sign-up URLs.
 */

import { DreamAPIConfig, DreamAPIError, DreamAPIException } from './types';

const DEFAULT_BASE_URL = 'https://api-multi.k-c-sheffield012376.workers.dev';

// Sign-up URLs based on pk prefix (NOT localhost detection)
// pk_test_xxx → workers.dev (TEST Clerk allows any domain)
// pk_live_xxx → custom domain (callback must be on subdomain of users.panacea-tech.net)
const SIGNUP_URL_TEST = 'https://sign-up.k-c-sheffield012376.workers.dev';
const SIGNUP_URL_LIVE = 'https://signup.users.panacea-tech.net';

// Clerk URLs for direct access (sign-in, account portal)
// These are Clerk's hosted pages URLs (decoded from pk_xxx keys)
const CLERK_URL_TEST = 'https://composed-blowfish-76.clerk.accounts.dev';
const CLERK_URL_LIVE = 'https://clerk.users.panacea-tech.net';

export class DreamClient {
  private secretKey: string | undefined;
  private publishableKey: string | undefined;
  private baseUrl: string;
  private signupUrl: string;
  private clerkUrl: string;
  private userToken: string | null = null;
  private tokenRefresher: (() => Promise<string | null>) | null = null;

  /**
   * Frontend-only mode: When only publishableKey is provided (no secretKey)
   * In this mode, only public endpoints and JWT-authenticated endpoints work
   */
  private readonly frontendOnly: boolean;

  constructor(config: DreamAPIConfig) {
    // Validate: at least one key must be provided
    if (!config.secretKey && !config.publishableKey) {
      throw new Error('DreamAPI: Either secretKey or publishableKey is required');
    }

    this.secretKey = config.secretKey;
    this.publishableKey = config.publishableKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;

    // Determine signup/clerk URLs based on pk prefix (NOT localhost)
    // pk_test_xxx → test URLs, pk_live_xxx → live URLs
    const isTestKey = this.publishableKey?.startsWith('pk_test_');
    this.signupUrl = config.signupUrl || (isTestKey ? SIGNUP_URL_TEST : SIGNUP_URL_LIVE);
    this.clerkUrl = config.clerkBaseUrl || (isTestKey ? CLERK_URL_TEST : CLERK_URL_LIVE);

    // Frontend-only mode when we have PK but no SK
    this.frontendOnly = !config.secretKey && !!config.publishableKey;

    if (this.frontendOnly) {
      console.log('[DreamAPI] Running in frontend-only mode (PK auth)');
    }
  }

  /**
   * Check if running in frontend-only mode
   */
  isFrontendOnly(): boolean {
    return this.frontendOnly;
  }

  /**
   * Set the end-user JWT token for user-specific operations.
   * Call this after the user signs in via Clerk.
   */
  setUserToken(token: string): void {
    this.userToken = token;
  }

  /**
   * Clear the current user token (on sign out)
   */
  clearUserToken(): void {
    this.userToken = null;
  }

  /**
   * Set a function to refresh the token before API calls
   */
  setTokenRefresher(refresher: () => Promise<string | null>): void {
    this.tokenRefresher = refresher;
  }

  /**
   * Refresh token if we have a refresher set
   */
  private async ensureFreshToken(): Promise<void> {
    if (this.tokenRefresher) {
      const newToken = await this.tokenRefresher();
      if (newToken) {
        this.userToken = newToken;
      }
    }
  }

  /**
   * Get the publishable key
   */
  getPublishableKey(): string | undefined {
    return this.publishableKey;
  }

  /**
   * Get the sign-up URL base
   */
  getSignupBaseUrl(): string {
    return this.signupUrl;
  }

  /**
   * Get the Clerk base URL for hosted auth pages
   */
  getClerkBaseUrl(): string {
    return this.clerkUrl;
  }

  /**
   * Make an authenticated request to the API
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    options: {
      body?: unknown;
      requiresUserToken?: boolean;
    } = {}
  ): Promise<T> {
    const { body, requiresUserToken = false } = options;

    // Auto-refresh token if we have a refresher and need user auth
    if (requiresUserToken || this.userToken) {
      await this.ensureFreshToken();
    }

    // Build headers based on auth mode
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.frontendOnly) {
      // Frontend-only mode: Use X-Publishable-Key header
      headers['X-Publishable-Key'] = this.publishableKey!;
    } else {
      // Full mode: Use Authorization header with secret key
      headers['Authorization'] = `Bearer ${this.secretKey}`;
      // Also add publishable key if available (for project filtering)
      if (this.publishableKey) {
        headers['X-Publishable-Key'] = this.publishableKey;
      }
    }

    // Add user token if required or available
    if (requiresUserToken) {
      if (!this.userToken) {
        throw new DreamAPIException(
          { error: 'auth_required', message: 'User token required. Call setUserToken() first.' },
          401
        );
      }
      headers['X-Clerk-Token'] = this.userToken;
    } else if (this.userToken) {
      // Include token even if not required (for endpoints that can use it)
      headers['X-Clerk-Token'] = this.userToken;
    }

    // Build URL
    const url = `${this.baseUrl}${endpoint}`;

    // Make request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Parse response
    const data = await response.json() as T | DreamAPIError;

    // Handle errors
    if (!response.ok) {
      const error = data as DreamAPIError;
      throw new DreamAPIException(error, response.status);
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, requiresUserToken = false): Promise<T> {
    return this.request<T>('GET', endpoint, { requiresUserToken });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, requiresUserToken = false): Promise<T> {
    return this.request<T>('POST', endpoint, { body, requiresUserToken });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, requiresUserToken = false): Promise<T> {
    return this.request<T>('PATCH', endpoint, { body, requiresUserToken });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, requiresUserToken = false): Promise<T> {
    return this.request<T>('DELETE', endpoint, { requiresUserToken });
  }
}
