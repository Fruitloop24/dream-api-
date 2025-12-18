import { verifyToken } from '@clerk/backend';
import { Env } from '../types';

/**
 * Require a Clerk JWT for platform (developer) actions.
 * Returns the authenticated Clerk userId or throws on failure.
 *
 * Note: Using @clerk/backend v2 API - verifyToken is a standalone function
 */
export async function requireClerkUser(request: Request, env: Env): Promise<string> {
	const authHeader = request.headers.get('Authorization') || '';
	if (!authHeader.startsWith('Bearer ')) {
		throw new Error('Missing Authorization bearer token');
	}

	const token = authHeader.replace('Bearer ', '');

	const verified = await verifyToken(token, {
		secretKey: env.CLERK_SECRET_KEY,
		// Optional: jwtKey for custom templates
	});

	return verified.sub;
}
