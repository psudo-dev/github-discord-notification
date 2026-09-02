async function verifySignature(
	secret: string,
	body: string,
	signature: string,
): Promise<boolean> {
	const encoder = new TextEncoder();

	const key: CryptoKey = await crypto.subtle.importKey(
		"raw", // bytes
		encoder.encode(secret), // Uint8Array encoded using UTF-8
		{ name: "HMAC", hash: "SHA-256" },
		false, // not extractable
		["sign"], // sign, !verify
	);

	// Message Authentication Code
	const mac: ArrayBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(body),
	);

	const expected: string =
		"sha256=" +
		Array.from(new Uint8Array(mac))
			.map((byte) => byte.toString(16).padStart(2, "0")) // HEX < 16 adds 0
			.join("");

	const a = encoder.encode(expected);
	const b = encoder.encode(signature);
	if (a.byteLength !== b.byteLength) return false;
	return crypto.subtle.timingSafeEqual(a, b);
}

async function processEvent(event: string, body: string, env: Env) {
	const payload = JSON.parse(body);
	console.log(payload.action);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		if (request.method !== "POST")
			return new Response("Method Not Allowed", { status: 405 });
		const secret: string = env.GITHUB_WEBHOOK_SECRET;
		const signature = request.headers.get("X-Hub-Signature-256");
		if (!signature) return new Response("Unauthorized", { status: 401 });

		const body: string = await request.text();
		const valid = await verifySignature(secret, body, signature);
		if (!valid) return new Response("Unauthorized", { status: 401 });

		const deliveryId = request.headers.get("X-GitHub-Delivery");
		if (!deliveryId) return new Response("Bad Request", { status: 400 });

		const seen = await env.KV.get(deliveryId);
		if (seen) return new Response("OK", { status: 200 });

		await env.KV.put(deliveryId, "1", { expirationTtl: 86400 });

		const event = request.headers.get("X-GitHub-Event");
		if (!event) return new Response("Bad Request", { status: 400 });

		ctx.waitUntil(processEvent(event, body, env));

		return new Response("OK", { status: 200 });
	},
};
