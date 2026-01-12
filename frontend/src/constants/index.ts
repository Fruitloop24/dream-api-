/**
 * ============================================================================
 * CONSTANTS - Centralized configuration for dream-api frontend
 * ============================================================================
 *
 * All magic strings, API URLs, and type definitions live here.
 * Import from '@/constants' throughout the app.
 *
 * WHY CONSTANTS VS ENV VARS?
 * --------------------------
 * - ENV VARS (import.meta.env.VITE_*): Build-time values, different per environment
 *   Use for: API URLs that change between dev/staging/prod
 *
 * - CONSTANTS (this file): Runtime values, same everywhere
 *   Use for: Type definitions, string literals, default values
 *
 * The pattern: ENV var with CONSTANT fallback
 *   const API = import.meta.env.VITE_API_URL || API_URLS.API_MULTI
 *
 * ============================================================================
 */

// ============================================================================
// API URLS
// ============================================================================

export const API_URLS = {
  /** Main API for SDK calls - usage, checkouts, webhooks */
  API_MULTI: 'https://api-multi.k-c-sheffield012376.workers.dev',

  /** Dev auth, platform IDs, credentials, project management */
  FRONT_AUTH_API: 'http://localhost:8788',

  /** Stripe Connect OAuth flow */
  OAUTH_API: 'http://localhost:8789',
} as const;

/**
 * Get API URL with environment override support
 * Usage: getApiUrl('API_MULTI') or getApiUrl('FRONT_AUTH_API')
 */
export function getApiUrl(key: keyof typeof API_URLS): string {
  const envKey = `VITE_${key}_URL`;
  return (import.meta.env[envKey] as string) || API_URLS[key];
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export const PROJECT_TYPES = {
  /** Subscription-based SaaS with usage limits (can include trial periods) */
  SAAS: 'saas',
  /** One-time purchase store with inventory */
  STORE: 'store',
} as const;

export type ProjectType = typeof PROJECT_TYPES[keyof typeof PROJECT_TYPES];

// ============================================================================
// MODES (Test vs Live)
// ============================================================================

export const MODES = {
  /** Stripe test mode - no real charges */
  TEST: 'test',
  /** Stripe live mode - real payments */
  LIVE: 'live',
} as const;

export type ModeType = typeof MODES[keyof typeof MODES];

// ============================================================================
// PLAN TIERS
// ============================================================================

export const PLAN_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  DEVELOPER: 'developer',
} as const;

export type PlanTier = typeof PLAN_TIERS[keyof typeof PLAN_TIERS];

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELING: 'canceling',
  CANCELED: 'canceled',
  NONE: 'none',
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// ============================================================================
// SHARED TYPES
// ============================================================================

/** Project as returned from front-auth-api /projects */
export interface Project {
  publishableKey: string;
  name: string;
  type: ProjectType;
  mode: ModeType;
  status: string;
  secretKey?: string | null;
}

/** Test + Live secret keys from KV */
export interface Credentials {
  testSecretKey: string | null;
  liveSecretKey: string | null;
}

/** Dashboard metrics for SaaS projects */
export interface SaasMetrics {
  activeSubs: number;
  cancelingSubs: number;
  mrr: number; // in cents
  usageThisPeriod: number;
}

/** Dashboard metrics for Store projects */
export interface StoreMetrics {
  storeSalesCount: number;
  storeTotalRevenue: number; // in cents
}

/** Subscription tier configuration */
export interface Tier {
  name: string;
  displayName?: string;
  price: number;
  limit: number | 'unlimited';
  priceId?: string;
  productId?: string;
  popular?: boolean;
}

/** Store product */
export interface Product {
  name: string;
  displayName?: string;
  price: number;
  priceId: string;
  productId: string;
  imageUrl?: string;
  inventory: number | null;
  soldOut?: boolean;
}

/** Customer in SaaS dashboard */
export interface Customer {
  userId: string;
  email?: string;
  plan: string;
  status: string;
  usageCount: number;
  limit: number | 'unlimited';
  canceledAt?: string;
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
}

/** Webhook event from Stripe */
export interface WebhookEvent {
  type: string;
  createdAt: string;
  payload?: any;
}

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const CUSTOMERS_PER_PAGE = 10;

/** Status badge color mappings */
export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-900/40 border-green-700 text-green-200',
  canceling: 'bg-yellow-900/40 border-yellow-700 text-yellow-200',
  canceled: 'bg-red-900/40 border-red-700 text-red-200',
  none: 'bg-gray-800 border-gray-700 text-gray-400',
};

/** Type badge color mappings */
export const TYPE_STYLES: Record<ProjectType, string> = {
  saas: 'bg-blue-900/30 border border-blue-700 text-blue-200',
  store: 'bg-purple-900/30 border border-purple-700 text-purple-200',
};

/** Mode badge color mappings */
export const MODE_STYLES: Record<ModeType, string> = {
  test: 'bg-amber-900/30 border border-amber-700 text-amber-200',
  live: 'bg-green-900/30 border border-green-700 text-green-200',
};
