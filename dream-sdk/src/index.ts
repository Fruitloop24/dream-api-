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
import { AuthHelpers } from './auth';
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

  constructor(config: DreamAPIConfig) {
    this.client = new DreamClient(config);

    // Initialize namespaced APIs
    this.auth = new AuthHelpers(this.client);
    this.customers = new CustomerAPI(this.client);
    this.usage = new UsageAPI(this.client);
    this.billing = new BillingAPI(this.client);
    this.products = new ProductAPI(this.client);
    this.dashboard = new DashboardAPI(this.client);
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
   * api.setUserToken(clerkJWT);
   * const { usage } = await api.usage.track();
   * console.log(`Used ${usage.used} of ${usage.limit}`);
   * ```
   */
  async track(): Promise<UsageTrackResult> {
    return this.client.post('/api/data', null, true);
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
    const response = await this.client.get<{ usage: Usage }>('/api/usage', true);
    return response.usage;
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
   */
  async cartCheckout(params: {
    items: Array<{ priceId: string; quantity: number }>;
    customerEmail: string;
    customerName?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<CheckoutResult> {
    return this.client.post('/api/cart/checkout', params);
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

// Default export
export default DreamAPI;
