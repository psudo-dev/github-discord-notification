import { handleResponseError } from "../handlers/response-error";
import type { InstallationToken } from "../types/types";

export function toBase64Url(data: string): string {
	const base64 = btoa(data); // Byte Char to ASCII
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function pemToDer(base64: string): ArrayBuffer {
	const binary = atob(base64); // ASCII to Byte Char
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i); // Byte Char to 0-255
	}
	return bytes.buffer;
}

export function generateHeaderAndPayload(env: Env): string {
	const header = { alg: "RS256", typ: "JWT" };
	const headerJson = JSON.stringify(header);
	const payload = {
		iat: Math.floor(Date.now() / 1000) - 60, // minus 60s
		exp: Math.floor(Date.now() / 1000) + 600, // 10 min
		iss: env.GITHUB_APP_ID,
	};
	const payloadJson = JSON.stringify(payload);

	return `${toBase64Url(headerJson)}.${toBase64Url(payloadJson)}`;
}

export async function getInstallationToken(
	installationId: number,
	jwt: string,
): Promise<InstallationToken> {
	const response = await fetch(
		`https://api.github.com/app/installations/${installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				"Authorization": `Bearer ${jwt}`,
				"Accept": "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"User-Agent": "github-discord-notification/1.0.0",
			},
		},
	);

	await handleResponseError(response);

	const data = (await response.json()) as { token: InstallationToken };
	return data.token;
}
