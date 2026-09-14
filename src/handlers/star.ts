import { buildAuthor, buildRepositoryField } from "../builders/utils";
import type { DiscordEmbed, DiscordField } from "../types/discord";
import type { BaseEventPayload, StarEvent } from "../types/github-events";
import { colorList } from "../utils/constants";
import { getDiscordRole, postToDiscord } from "../utils/discord";
import { basePayloadOrFallback, hexToNumber } from "../utils/utils";

export async function handleStar(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	let { action, starred_at } = payload as StarEvent;
	const discordRole = getDiscordRole(env);

	if (!starred_at) starred_at = new Date().toISOString();
	let content: string;
	let title: string;
	let color: number;

	if (action === "created") {
		content = `Your repository **${repository.name}** got a ⭐!\n${discordRole}`;
		title = `${repository.name} has ${repository.stargazers_count} stars!`;
		color = hexToNumber(colorList.star);
	} else {
		content = `Your repository **${repository.name}** lost a ⭐\n${discordRole}`;
		title = `${repository.name} has \`-1\` star...`;
		color = hexToNumber(colorList.dismissed);
	}
	await postToDiscord(content, env);

	const starsField: DiscordField = {
		name: "Stars",
		value: `${repository.stargazers_count}`,
		inline: true,
	};

	const stargazersField: DiscordField = {
		name: "Stargazers",
		value: `[Direct link](${repository.html_url}/stargazers)`,
		inline: true,
	};

	const embeds: DiscordEmbed[] = [
		{
			title: title,
			color: color,
			fields: [buildRepositoryField(repository), starsField, stargazersField],
			author: buildAuthor(sender),
			timestamp: starred_at,
		},
	];

	await postToDiscord(embeds, env);
}
