import { buildCommentEmbed } from "../builders/comment";
import { buildIssueEmbed } from "../builders/issues";
import { buildPrContent } from "../builders/pull-request";
import type { DiscordEmbed } from "../types/discord";
import { commentActions, issuesActions } from "../types/github";
import type {
	BaseEventPayload,
	IssueCommentEvent,
	IssuesEvent,
} from "../types/github-events";
import { allowed_mentions, colorList } from "../utils/constants";
import { postToDiscord } from "../utils/discord";
import {
	basePayloadOrFallback,
	formatText,
	hexToNumber,
	noLinkPreview,
} from "../utils/utils";

export async function handleIssues(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	const { action, issue } = payload as IssuesEvent;
	if (!issuesActions.includes(action)) return;

	const ghostwriter = env.DISCORD_ROLE_ID;
	const draftContent = `
	**[issue #${issue.number}] ${repository.full_name}**
	_ _
	The issue **${noLinkPreview(issue.title, issue.html_url, true)}** has been **${action}** by **${noLinkPreview(sender.login, sender.html_url)}**.
	${ghostwriter}
	`;
	const content = formatText(draftContent);
	await postToDiscord({ content }, env);

	const color = hexToNumber(colorList.issue);
	const embeds: DiscordEmbed[] = [buildIssueEmbed(issue, repository, color)];

	await postToDiscord({ embeds, allowed_mentions }, env);
}

export async function handleIssueComment(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	const { action, issue, comment } = payload as IssueCommentEvent;
	if (!commentActions.includes(action)) return;

	const ghostwriter = env.DISCORD_ROLE_ID;
	let content: string;
	let color: number;
	const createdOrDeleted =
		action === "created" ? "commented" : "deleted his comment";

	if (!issue.pull_request) {
		const draftContent = `
		**[issue #${issue.number}] ${repository.full_name}**
		_ _
		**${noLinkPreview(sender.login, sender.html_url)}** ${createdOrDeleted} on **${noLinkPreview(issue.title, comment.html_url, true)}**.
		${ghostwriter}
		`;
		content = formatText(draftContent);
		color = hexToNumber(colorList.issue);
	} else {
		const status = `${createdOrDeleted} on the pull request thread`;
		content = buildPrContent(
			issue,
			payload,
			comment.html_url,
			status,
			ghostwriter,
		);
		color = hexToNumber(colorList.pull_request);
	}
	await postToDiscord({ content }, env);

	let commentColor = color;
	if (action === "deleted") commentColor = hexToNumber(colorList.dismissed);

	const embeds: DiscordEmbed[] = [
		buildCommentEmbed(comment, createdOrDeleted, commentColor),
		buildIssueEmbed(issue, repository, color),
	];
	await postToDiscord({ embeds, allowed_mentions }, env);
}
