import { Env } from '../types';

type UploadBody = {
	filename: string;
	contentType?: string;
	data: string; // base64 string
};

function decodeBase64(data: string): Uint8Array {
	const binary = atob(data);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function handleAssetUpload(
	env: Env,
	platformId: string,
	corsHeaders: Record<string, string>,
	request: Request
): Promise<Response> {
	if (!env.dream_api_assets) {
		return new Response(JSON.stringify({ error: 'Assets bucket not configured' }), {
			status: 501,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	let body: UploadBody;
	try {
		body = await request.json() as UploadBody;
	} catch (err) {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	if (!body?.filename || !body?.data) {
		return new Response(JSON.stringify({ error: 'Missing filename or data' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const bytes = decodeBase64(body.data);
	const key = `${platformId}/${Date.now()}-${sanitizeFilename(body.filename)}`;
	await env.dream_api_assets.put(key, bytes, {
		httpMetadata: {
			contentType: body.contentType || 'application/octet-stream',
		},
	});

	return new Response(JSON.stringify({ key, url: `/api/assets/${key}` }), {
		status: 200,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export async function handleAssetGet(
	env: Env,
	platformId: string,
	pathname: string,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (!env.dream_api_assets) {
		return new Response('Not configured', { status: 501, headers: corsHeaders });
	}

	const key = pathname.replace('/api/assets/', '');
	if (platformId && !key.startsWith(platformId)) {
		return new Response('Not found', { status: 404, headers: corsHeaders });
	}

	const obj = await env.dream_api_assets.get(key);
	if (!obj) {
		return new Response('Not found', { status: 404, headers: corsHeaders });
	}

	const headers: Record<string, string> = { ...corsHeaders };
	if (obj.httpMetadata?.contentType) headers['Content-Type'] = obj.httpMetadata.contentType;
	if (obj.httpMetadata?.cacheControl) headers['Cache-Control'] = obj.httpMetadata.cacheControl;

	return new Response(obj.body, { status: 200, headers });
}
