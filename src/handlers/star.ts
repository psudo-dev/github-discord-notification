import { buildAuthor, buildRepositoryField } from "../builders/utils";
import { allowed_mentions, colorList } from "../constants";
import { postToDiscord } from "../discord";
import type { DiscordEmbed, DiscordField } from "../types/discord";
import type { BaseEventPayload, StarEvent } from "../types/github-events";
import { basePayloadOrFallback, hexToNumber } from "../utils";

export async function handleStar(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	let { action, starred_at } = payload as StarEvent;
	const ghostwriter = env.DISCORD_ROLE_ID;

	if (!starred_at) starred_at = new Date().toISOString();
	let content: string;
	let title: string;
	let color: number;

	if (action === "created") {
		content = `Your repository **${repository.name}** got a ⭐!\n${ghostwriter}`;
		title = `${repository.name} has ${repository.stargazers_count} stars!`;
		color = hexToNumber(colorList.star);
	} else {
		content = `Your repository **${repository.name}** lost a ⭐\n${ghostwriter}`;
		title = `${repository.name} has \`-1\` star...`;
		color = hexToNumber(colorList.dismissed);
	}
	await postToDiscord({ content }, env);

	const starsField: DiscordField = {
		name: "Stars",
		value: `${repository.stargazers_count}`,
		inline: true,
	};

	const stargazersField: DiscordField = {
		name: "Stargazers",
		value: `[Direct link](${repository.stargazers_url})`,
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

	await postToDiscord({ embeds, allowed_mentions }, env);
}
