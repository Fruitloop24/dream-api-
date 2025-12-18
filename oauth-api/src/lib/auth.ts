import { createClerkClient } from '@clerk/backend';
import { Env } from '../types';

/**
 * Require a Clerk JWT for platform (developer) actions.
 * Returns the authenticated Clerk userId or throws on failure.
 */
export async function requireClerkUser(request: Request, env: Env): Promise<string> {
	const authHeader = request.headers.get('Authorization') || '';
	if (!authHeader.startsWith('Bearer ')) {
		throw new Error('Missing Authorization bearer token');
	}

	const token = authHeader.replace('Bearer ', '');
	const clerk = createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	});

	const verified = await clerk.verifyToken(token, {
		// Optional template; ignore if not configured
		template: (env as any).CLERK_JWT_TEMPLATE,
	});

	return verified.sub;
}
