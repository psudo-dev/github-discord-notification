import { pemToDer, toBase64Url } from "./utils";

export async function generateJwt(
	headerAndPayload: string,
	env: Env,
): Promise<string> {
	const encoder = new TextEncoder();
	const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
	const extractable = false;

	const key: CryptoKey = await crypto.subtle.importKey(
		"pkcs8", // format standard
		pemToDer(env.GITHUB_PRIVATE_KEY), // in bytes
		algorithm,
		extractable,
		["sign"], // sign, !verify
	);

	const signatureBuffer: ArrayBuffer = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		encoder.encode(headerAndPayload),
	);

	const data: string = String.fromCharCode(...new Uint8Array(signatureBuffer));
	const signature: string = toBase64Url(data);

	const jwt = `${headerAndPayload}.${signature}`;
	return jwt;
}
