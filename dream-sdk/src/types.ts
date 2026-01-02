/**
 * Dream API SDK - Type Definitions
 */

// ============================================================================
// Configuration
// ============================================================================

export interface DreamAPIConfig {
  /**
   * Your secret key (sk_test_xxx or sk_live_xxx)
   * Required for backend/admin operations (customers, dashboard)
   * Optional for frontend operations (tiers, products, usage with JWT)
   */
  secretKey?: string;
  /**
   * Your publishable key (pk_test_xxx or pk_live_xxx)
   * Required for frontend-only mode (when no secretKey provided)
   * Also used for auth URL helpers
   */
  publishableKey?: string;
  /** Base URL override (for testing) */
  baseUrl?: string;
  /** Sign-up worker URL override */
  signupUrl?: string;
  /** Clerk base URL override (for production) */
  clerkBaseUrl?: string;
}

// ============================================================================
// API Responses
// ============================================================================

export interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: string;
  publishableKey: string;
  createdAt: number;
}

export interface CreateCustomerParams {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  plan?: string;
}

export interface Usage {
  userId: string;
  plan: string;
  usageCount: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  periodStart: string;
  periodEnd: string;
}

export interface UsageTrackResult {
  success: boolean;
  usage: Usage;
}

export interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number;
  priceId: string;
  productId: string;
  features?: string[];
  popular?: boolean;
}

export interface Product {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  price: number;
  currency?: string;
  priceId: string;
  productId: string;
  imageUrl?: string;
  inventory?: number | null;
  soldOut?: boolean;
  features?: string[];
}

export interface CheckoutResult {
  url: string;
  sessionId?: string;
}

export interface PortalResult {
  url: string;
}

export interface DashboardMetrics {
  activeSubscriptions: number;
  cancelingSubscriptions: number;
  mrr: number;
  totalRevenue?: number;
  totalSales?: number;
  avgOrderValue?: number;
  usageThisPeriod: number;
  customers: DashboardCustomer[];
  tiers: Tier[];
  products?: Product[];
  orders?: Order[];
  webhookStatus: WebhookStatus;
}

export interface DashboardCustomer {
  id: string;
  email: string;
  plan: string;
  usage: number;
  limit: number;
  status: string;
  renewsAt?: string;
}

export interface Order {
  customer: string;
  email: string;
  amount: number;
  paymentId: string;
  date: string;
}

export interface WebhookStatus {
  url: string;
  lastEvent?: string;
  recentEvents: Array<{
    type: string;
    timestamp: string;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

export interface DreamAPIError {
  error: string;
  message: string;
  status?: number;
}

export class DreamAPIException extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(error: DreamAPIError, status: number = 500) {
    super(error.message);
    this.name = 'DreamAPIException';
    this.status = status;
    this.code = error.error;
  }
}
