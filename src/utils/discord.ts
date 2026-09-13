import { handleResponseError } from "../handlers/response-error";
import type { DiscordPost } from "../types/discord";

export async function fetchToDiscord(
	body: string,
	url: string,
): Promise<Response> {
	return await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: body,
	});
}

export async function postToDiscord(
	discordPost: DiscordPost,
	env: Env,
): Promise<void> {
	const body = JSON.stringify(discordPost);
	const url = env.DISCORD_WEBHOOK_URL;
	let response = await fetchToDiscord(body, url);
	let retries = 5;
	while (response.status === 429 && retries > 0) {
		const retryAfter = response.headers.get("Retry-After");
		const wait = retryAfter ? parseFloat(retryAfter) * 1000 : 5000;
		await new Promise((resolve) => setTimeout(resolve, wait));
		response = await fetchToDiscord(body, url);
		retries--;
	}
	await handleResponseError(response);
}
