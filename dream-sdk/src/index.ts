/**
 * Dream API SDK
 *
 * Official SDK for Dream API - Auth, billing, and usage tracking in one API.
 *
 * @example
 * ```typescript
 * import { DreamAPI } from '@dream-api/sdk';
 *
 * const api = new DreamAPI({
 *   secretKey: 'sk_test_xxx',
 *   publishableKey: 'pk_test_xxx',
 * });
 *
 * // Backend operations (SK only)
 * await api.customers.create({ email: 'user@example.com' });
 * const { tiers } = await api.products.listTiers();
 * const dashboard = await api.dashboard.get();
 *
 * // Frontend operations (needs user token)
 * api.setUserToken(clerkJWT);
 * await api.usage.track();
 * const usage = await api.usage.check();
 * const { url } = await api.billing.createCheckout({ tier: 'pro' });
 * ```
 */

import { DreamClient } from './client';
import { AuthHelpers, ClerkUser } from './auth';
import {
  DreamAPIConfig,
  Customer,
  CreateCustomerParams,
  Usage,
  UsageTrackResult,
  Tier,
  Product,
  CheckoutResult,
  PortalResult,
  DashboardMetrics,
} from './types';

// Re-export types
export * from './types';
export type { ClerkUser };

/**
 * Dream API SDK Client
 */
export class DreamAPI {
  private client: DreamClient;

  /** Auth URL helpers */
  public readonly auth: AuthHelpers;

  /** Customer management */
  public readonly customers: CustomerAPI;

  /** Usage tracking */
  public readonly usage: UsageAPI;

  /** Billing operations */
  public readonly billing: BillingAPI;

  /** Product catalog */
  public readonly products: ProductAPI;

  /** Dashboard metrics */
  public readonly dashboard: DashboardAPI;

  /** Account management (self-service) */
  public readonly account: AccountAPI;

  constructor(config: DreamAPIConfig) {
    this.client = new DreamClient(config);

    // Initialize namespaced APIs
    this.auth = new AuthHelpers(this.client);
    this.customers = new CustomerAPI(this.client);
    this.usage = new UsageAPI(this.client);
    this.billing = new BillingAPI(this.client);
    this.products = new ProductAPI(this.client);
    this.dashboard = new DashboardAPI(this.client);
    this.account = new AccountAPI(this.client);
  }

  /**
   * Set the end-user JWT token.
   * Required for user-specific operations (usage, billing).
   *
   * @example
   * ```typescript
   * // After user signs in via Clerk
   * const token = await clerk.session.getToken();
   * api.setUserToken(token);
   * ```
   */
  setUserToken(token: string): void {
    this.client.setUserToken(token);
  }

  /**
   * Clear the user token (on sign out)
   */
  clearUserToken(): void {
    this.client.clearUserToken();
  }
}

// ============================================================================
// Customer API
// ============================================================================

class CustomerAPI {
  constructor(private client: DreamClient) {}

  /**
   * Create a new customer
   *
   * @example
   * ```typescript
   * const { customer } = await api.customers.create({
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   plan: 'free',
   * });
   * ```
   */
  async create(params: CreateCustomerParams): Promise<{ customer: Customer }> {
    return this.client.post('/api/customers', params);
  }

  /**
   * Get a customer by ID
   */
  async get(customerId: string): Promise<{ customer: Customer }> {
    return this.client.get(`/api/customers/${customerId}`);
  }

  /**
   * Update a customer's plan
   */
  async update(customerId: string, params: { plan: string }): Promise<{ customer: Customer }> {
    return this.client.patch(`/api/customers/${customerId}`, params);
  }

  /**
   * Delete a customer
   */
  async delete(customerId: string): Promise<{ success: boolean; deleted: { id: string; email: string } }> {
    return this.client.delete(`/api/customers/${customerId}`);
  }
}

// ============================================================================
// Usage API
// ============================================================================

class UsageAPI {
  constructor(private client: DreamClient) {}

  /**
   * Track a usage event.
   * Increments the user's usage counter for the current period.
   *
   * @example
   * ```typescript
   * const { usage } = await api.usage.track();
   * console.log(`Used ${usage.usageCount} of ${usage.limit}`);
   * ```
   */
  async track(): Promise<UsageTrackResult> {
    const response = await this.client.post<UsageTrackResult | Usage>('/api/data', null, true);
    // Handle both { success, usage } and direct usage response
    if ('success' in response) {
      return response as UsageTrackResult;
    }
    return { success: true, usage: response as Usage };
  }

  /**
   * Check current usage without incrementing.
   *
   * @example
   * ```typescript
   * const usage = await api.usage.check();
   * if (usage.remaining <= 0) {
   *   // Show upgrade prompt
   * }
   * ```
   */
  async check(): Promise<Usage> {
    const response = await this.client.get<Usage | { usage: Usage }>('/api/usage', true);
    // Handle both { usage: {...} } and direct usage object
    return (response as { usage: Usage }).usage || response as Usage;
  }
}

// ============================================================================
// Billing API
// ============================================================================

class BillingAPI {
  constructor(private client: DreamClient) {}

  /**
   * Create a checkout session for subscription upgrade.
   *
   * @example
   * ```typescript
   * const { url } = await api.billing.createCheckout({
   *   tier: 'pro',
   *   successUrl: '/success',
   *   cancelUrl: '/pricing',
   * });
   * window.location.href = url;
   * ```
   */
  async createCheckout(params: {
    tier?: string;
    priceId?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<CheckoutResult> {
    return this.client.post('/api/create-checkout', params, true);
  }

  /**
   * Open the Stripe customer portal for billing management.
   *
   * @example
   * ```typescript
   * const { url } = await api.billing.openPortal({ returnUrl: '/dashboard' });
   * window.location.href = url;
   * ```
   */
  async openPortal(params?: { returnUrl?: string }): Promise<PortalResult> {
    return this.client.post('/api/customer-portal', params, true);
  }
}

// ============================================================================
// Product API
// ============================================================================

class ProductAPI {
  constructor(private client: DreamClient) {}

  /**
   * List subscription tiers
   */
  async listTiers(): Promise<{ tiers: Tier[] }> {
    return this.client.get('/api/tiers');
  }

  /**
   * List products (for store projects)
   */
  async list(): Promise<{ products: Product[] }> {
    return this.client.get('/api/products');
  }

  /**
   * Create a cart checkout (guest checkout for store)
   *
   * @example
   * ```typescript
   * const { url } = await api.products.cartCheckout({
   *   items: [{ priceId: 'price_xxx', quantity: 1 }],
   *   customerEmail: 'customer@example.com',
   *   successUrl: '/success',
   *   cancelUrl: '/cart',
   * });
   * window.location.href = url;
   * ```
   */
  async cartCheckout(params: {
    items: Array<{ priceId: string; quantity: number }>;
    customerEmail?: string;
    customerName?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<CheckoutResult> {
    // Transform SDK-friendly names to API field names
    const apiParams = {
      items: params.items,
      email: params.customerEmail,
      name: params.customerName,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    };
    return this.client.post('/api/cart/checkout', apiParams);
  }
}

// ============================================================================
// Dashboard API
// ============================================================================

class DashboardAPI {
  constructor(private client: DreamClient) {}

  /**
   * Get dashboard metrics
   *
   * @example
   * ```typescript
   * const dashboard = await api.dashboard.get();
   * console.log(`MRR: $${dashboard.mrr}`);
   * console.log(`Active subs: ${dashboard.activeSubscriptions}`);
   * ```
   */
  async get(): Promise<DashboardMetrics> {
    return this.client.get('/api/dashboard');
  }

  /**
   * Get aggregate totals across all projects
   */
  async getTotals(): Promise<{
    totalRevenue: number;
    totalCustomers: number;
    totalMRR: number;
  }> {
    return this.client.get('/api/dashboard/totals');
  }
}

// ============================================================================
// Account API (Self-service)
// ============================================================================

class AccountAPI {
  constructor(private client: DreamClient) {}

  /**
   * Delete the current user's account.
   * This permanently removes all user data.
   *
   * @example
   * ```typescript
   * await api.account.delete();
   * // User is now signed out and deleted
   * ```
   */
  async delete(): Promise<{ success: boolean; message: string }> {
    return this.client.delete('/api/me', true);
  }
}

// Default export
export default DreamAPI;
