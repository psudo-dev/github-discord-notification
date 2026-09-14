import { handleResponseError } from "../handlers/response-error";
import type {
	DiscordContent,
	DiscordEmbed,
	DiscordMentions,
	DiscordPost,
	DiscordRole,
} from "../types/discord";

export function getDiscordRole(env: Env): DiscordRole {
	const roleId = env.DISCORD_ROLE_ID;
	return `<@&${roleId}>`;
}

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
	discordMessage: DiscordContent | DiscordEmbed[],
	env: Env,
): Promise<void> {
	const roleId = env.DISCORD_ROLE_ID;
	const allowed_mentions: DiscordMentions = { parse: [], roles: [roleId] };
	let post: DiscordPost;
	if (typeof discordMessage === "string") {
		post = {
			content: discordMessage,
			allowed_mentions,
		};
	} else {
		post = {
			embeds: discordMessage,
			allowed_mentions,
		};
	}
	const body = JSON.stringify(post);
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
