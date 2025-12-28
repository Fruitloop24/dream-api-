/**
 * ============================================================================
 * CUSTOMER MANAGEMENT ROUTES - dream-api
 * ============================================================================
 *
 * ENDPOINTS:
 * POST /api/customers - Create a new customer in end-user-api Clerk
 *
 * PURPOSE:
 * Allow devs to create customers in the shared end-user-api Clerk app.
 * Each customer gets `publicMetadata.publishableKey` set to the dev's pk.
 * This is how we isolate customers between different devs in ONE Clerk app.
 *
 * THE MAGIC:
 * - Dev calls: POST /api/customers with their sk_live_xxx
 * - We verify sk_live_xxx → get platformId → get publishableKey
 * - We create user in end-user-api Clerk
 * - We set: publicMetadata.publishableKey = pk_live_xxx
 * - End-user's JWT now has: { publishableKey: "pk_live_xxx" }
 * - Dashboard queries: WHERE publishable_key = 'pk_live_xxx'
 *
 * ============================================================================
 */

import { ClerkClient } from '@clerk/backend';
import { Env } from '../types';
import { upsertEndUser, upsertUsageSnapshot } from '../services/d1';
import { getCurrentPeriod } from '../services/kv';

interface CreateCustomerBody {
	email: string;
	password?: string;
	firstName?: string;
	lastName?: string;
	plan?: string;
}

/**
 * Handle POST /api/customers - Create a customer in end-user-api Clerk
 *
 * @param platformId - Dev's platform ID (from API key)
 * @param publishableKey - Dev's publishable key (for customer metadata)
 * @param clerkClient - Clerk client (end-user-api)
 * @param env - Worker environment
 * @param corsHeaders - CORS headers
 * @param request - Original request (for body)
 */
export async function handleCreateCustomer(
	platformId: string,
	publishableKey: string,
	clerkClient: ClerkClient,
	env: Env,
	corsHeaders: Record<string, string>,
	request: Request
): Promise<Response> {
	try {
		const body: CreateCustomerBody = await request.json();

		// Validate required fields
		if (!body.email) {
			return new Response(
				JSON.stringify({
					error: 'Missing required field',
					message: 'email is required',
				}),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		// Create user in end-user-api Clerk app
		// This is the SHARED Clerk app for ALL devs' customers
		const user = await clerkClient.users.createUser({
			emailAddress: [body.email],
			password: body.password || undefined,
			firstName: body.firstName || undefined,
			lastName: body.lastName || undefined,
			publicMetadata: {
				// THE KEY PART: publishableKey identifies which dev owns this customer
				publishableKey: publishableKey,
				// Optional: initial plan (dev can update later)
				plan: body.plan || 'free',
			},
		});

		console.log(`[Customers] Created user ${user.id} for platform ${platformId} (pk: ${publishableKey})`);

		// Write to D1 for dashboard/SSOT
		await upsertEndUser(env, platformId, publishableKey, user.id, body.email);
		const period = getCurrentPeriod();
		await upsertUsageSnapshot(env, platformId, user.id, body.plan || 'free', period.start, period.end, 0);

		return new Response(
			JSON.stringify({
				success: true,
				customer: {
					id: user.id,
					email: body.email,
					firstName: body.firstName,
					lastName: body.lastName,
					plan: body.plan || 'free',
					publishableKey: publishableKey,
					createdAt: user.createdAt,
				},
			}),
			{
				status: 201,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('[Customers] Error creating customer:', error);

		// Handle Clerk-specific errors
		if (error.errors) {
			const clerkErrors = error.errors.map((e: any) => e.message).join(', ');
			return new Response(
				JSON.stringify({
					error: 'Failed to create customer',
					message: clerkErrors,
				}),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		return new Response(
			JSON.stringify({
				error: 'Failed to create customer',
				message: error.message || 'Unknown error',
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}

/**
 * Handle GET /api/customers/:id - Get a customer by ID
 */
export async function handleGetCustomer(
	customerId: string,
	platformId: string,
	publishableKey: string,
	clerkClient: ClerkClient,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const user = await clerkClient.users.getUser(customerId);

		// Verify this customer belongs to this dev (check publishableKey)
		if (user.publicMetadata?.publishableKey !== publishableKey) {
			return new Response(
				JSON.stringify({
					error: 'Not found',
					message: 'Customer not found or does not belong to your platform',
				}),
				{
					status: 404,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		return new Response(
			JSON.stringify({
				customer: {
					id: user.id,
					email: user.emailAddresses[0]?.emailAddress,
					firstName: user.firstName,
					lastName: user.lastName,
					plan: user.publicMetadata?.plan || 'free',
					publishableKey: user.publicMetadata?.publishableKey,
					createdAt: user.createdAt,
				},
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('[Customers] Error getting customer:', error);
		return new Response(
			JSON.stringify({
				error: 'Customer not found',
				message: error.message || 'Unknown error',
			}),
			{
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}

/**
 * Handle PATCH /api/customers/:id - Update a customer's plan
 */
export async function handleUpdateCustomer(
	customerId: string,
	platformId: string,
	publishableKey: string,
	clerkClient: ClerkClient,
	env: Env,
	corsHeaders: Record<string, string>,
	request: Request
): Promise<Response> {
	try {
		const body = await request.json() as { plan?: string };

		// First verify this customer belongs to this dev
		const user = await clerkClient.users.getUser(customerId);
		if (user.publicMetadata?.publishableKey !== publishableKey) {
			return new Response(
				JSON.stringify({
					error: 'Not found',
					message: 'Customer not found or does not belong to your platform',
				}),
				{
					status: 404,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		// Update user metadata
		const updatedUser = await clerkClient.users.updateUserMetadata(customerId, {
			publicMetadata: {
				...user.publicMetadata,
				plan: body.plan || user.publicMetadata?.plan,
			},
		});

		// Mirror plan to D1 usage snapshot (no counter change here)
		if (body.plan) {
			const period = getCurrentPeriod();
			await upsertUsageSnapshot(env, platformId, customerId, body.plan, period.start, period.end, 0);
		}

		return new Response(
			JSON.stringify({
				success: true,
				customer: {
					id: updatedUser.id,
					email: updatedUser.emailAddresses[0]?.emailAddress,
					plan: updatedUser.publicMetadata?.plan,
				},
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('[Customers] Error updating customer:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to update customer',
				message: error.message || 'Unknown error',
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}

/**
 * Handle DELETE /api/customers/:id - Delete a customer
 *
 * Removes customer from:
 * 1. Clerk (end-user-api shared app)
 * 2. D1 end_users table
 * 3. D1 usage_counts table
 * 4. D1 subscriptions table
 *
 * SECURITY: Verifies customer belongs to caller's publishableKey before deletion.
 */
export async function handleDeleteCustomer(
	customerId: string,
	platformId: string,
	publishableKey: string,
	clerkClient: ClerkClient,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		// First verify this customer belongs to this dev
		const user = await clerkClient.users.getUser(customerId);

		if (user.publicMetadata?.publishableKey !== publishableKey) {
			return new Response(
				JSON.stringify({
					error: 'Not found',
					message: 'Customer not found or does not belong to your platform',
				}),
				{
					status: 404,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		const email = user.emailAddresses[0]?.emailAddress || '';
		console.log(`[Customers] Deleting ${customerId} (${email})`);

		// Delete from Clerk (shared end-user-api app)
		await clerkClient.users.deleteUser(customerId);
		console.log(`[Customers] Deleted user ${customerId} from Clerk`);

		// Clean up D1 tables
		// Delete from end_users
		await env.DB.prepare(
			'DELETE FROM end_users WHERE clerkUserId = ? AND publishableKey = ?'
		).bind(customerId, publishableKey).run();

		// Delete from usage_counts
		await env.DB.prepare(
			'DELETE FROM usage_counts WHERE userId = ? AND publishableKey = ?'
		).bind(customerId, publishableKey).run();

		// Delete from subscriptions
		await env.DB.prepare(
			'DELETE FROM subscriptions WHERE userId = ? AND publishableKey = ?'
		).bind(customerId, publishableKey).run();

		console.log(`[Customers] Cleaned up D1 records for ${customerId}`);

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Customer deleted successfully',
				deleted: {
					id: customerId,
					email: email,
				},
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('[Customers] Error deleting customer:', error);

		// Handle Clerk "user not found" as already deleted
		if (error.status === 404 || error.message?.includes('not found')) {
			return new Response(
				JSON.stringify({
					error: 'Customer not found',
					message: 'Customer may have already been deleted',
				}),
				{
					status: 404,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		return new Response(
			JSON.stringify({
				error: 'Failed to delete customer',
				message: error.message || 'Unknown error',
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}
