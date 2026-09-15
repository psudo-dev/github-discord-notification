import { buildAuthor } from "../builders/utils";
import type { DiscordEmbed, DiscordField } from "../types/discord";
import type { BaseEventPayload, ForkEvent } from "../types/github-events";
import { colorList, orphanedRepository } from "../utils/constants";
import { getDiscordRole, postToDiscord } from "../utils/discord";
import {
	basePayloadOrFallback,
	formatText,
	hexToNumber,
	noLinkPreview,
} from "../utils/utils";

export async function handleFork(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	let { forkee } = payload as ForkEvent;
	if (!forkee) forkee = orphanedRepository;
	const discordRole = getDiscordRole(env);

	const content = `**${sender.login}** forked **${repository.full_name}**!\n${discordRole}`;
	await postToDiscord(content, env);

	const title = "forked your repository:";
	const draftDescription = `
	**URL**: ${noLinkPreview(forkee.full_name, forkee.html_url)}
	**Visibility**: ${repository.private ? "Private" : "Public"}
	`;
	const description = formatText(draftDescription);
	const color = hexToNumber(colorList.fork);
	const fields: DiscordField[] = [
		{
			name: "Forked Repository",
			value: `[${repository.full_name}](<${repository.html_url}>)`,
		},
		{
			name: "Forks Count",
			value: `${repository.forks_count}`,
		},
	];
	const embeds: DiscordEmbed[] = [
		{
			title,
			description,
			color,
			fields,
			author: buildAuthor(sender),
			timestamp: forkee.created_at,
		},
	];

	await postToDiscord(embeds, env);
}
