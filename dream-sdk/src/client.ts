/**
 * Dream API SDK - HTTP Client
 *
 * Handles all HTTP communication with the Dream API.
 * Automatically injects authentication headers.
 */

import { DreamAPIConfig, DreamAPIError, DreamAPIException } from './types';

const DEFAULT_BASE_URL = 'https://api-multi.k-c-sheffield012376.workers.dev';
const DEFAULT_SIGNUP_URL = 'https://sign-up.k-c-sheffield012376.workers.dev';
const DEFAULT_CLERK_URL = 'https://composed-blowfish-76.accounts.dev';

export class DreamClient {
  private secretKey: string;
  private publishableKey: string | undefined;
  private baseUrl: string;
  private signupUrl: string;
  private clerkUrl: string;
  private userToken: string | null = null;
  private tokenRefresher: (() => Promise<string | null>) | null = null;

  constructor(config: DreamAPIConfig) {
    if (!config.secretKey) {
      throw new Error('DreamAPI: secretKey is required');
    }

    this.secretKey = config.secretKey;
    this.publishableKey = config.publishableKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.signupUrl = config.signupUrl || DEFAULT_SIGNUP_URL;
    this.clerkUrl = config.clerkBaseUrl || DEFAULT_CLERK_URL;
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

    // Build headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };

    // Add publishable key header if available
    if (this.publishableKey) {
      headers['X-Publishable-Key'] = this.publishableKey;
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
