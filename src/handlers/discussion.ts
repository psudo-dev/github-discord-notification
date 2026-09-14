import { buildCommentEmbed } from "../builders/comment";
import { buildDiscussionEmbed } from "../builders/discussion";
import { buildAuthor } from "../builders/utils";
import type { DiscordEmbed } from "../types/discord";
import { commentActions, discussionActions } from "../types/github";
import type {
	BaseEventPayload,
	DiscussionCommentEvent,
	DiscussionEvent,
} from "../types/github-events";
import { colorList } from "../utils/constants";
import { getDiscordRole, postToDiscord } from "../utils/discord";
import {
	basePayloadOrFallback,
	formatText,
	hexToNumber,
	noLinkPreview,
	truncateText,
} from "../utils/utils";

export async function handleDiscussion(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	const { action, answer, discussion } = payload as DiscussionEvent;
	if (!discussionActions.includes(action)) return;

	const discordRole = getDiscordRole(env);

	const contentAttachment =
		action === "created" || action === "closed"
			? `**${action}**`
			: `marked as **${action}**`;
	const draftContent = `
	**[discussion #${discussion.number}] ${repository.full_name}**
	_ _
	The discussion **${noLinkPreview(discussion.title, discussion.html_url, true)}** has been ${contentAttachment} by **${noLinkPreview(sender.login, sender.html_url)}**.
	${discordRole}
	`;
	const content = formatText(draftContent);
	await postToDiscord(content, env);

	let embeds: DiscordEmbed[] = [buildDiscussionEmbed(discussion, repository)];
	if (answer) {
		const answerEmbed: DiscordEmbed = {
			title: "Selected answer:",
			description: truncateText(answer.body, 1000),
			color: hexToNumber(colorList.resolved),
			author: buildAuthor(answer.user),
			timestamp: answer.updated_at,
		};
		embeds = [answerEmbed, ...embeds];
	}

	await postToDiscord(embeds, env);
}

export async function handleDiscussionComment(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	const { action, discussion, comment } = payload as DiscussionCommentEvent;
	if (!commentActions.includes(action)) return;

	const discordRole = getDiscordRole(env);

	const createdOrDeleted =
		action === "created" ? "commented" : "deleted his comment";
	const draftContent = `
	**[discussion #${discussion.number}] ${repository.full_name}**
	_ _
	**${noLinkPreview(sender.login, sender.html_url)}** ${createdOrDeleted} on **${noLinkPreview(discussion.title, comment.html_url, true)}**.
	${discordRole}
	`;
	const content = formatText(draftContent);
	await postToDiscord(content, env);

	const commentColor =
		action === "created"
			? hexToNumber(colorList.discussion)
			: hexToNumber(colorList.dismissed);

	const embeds: DiscordEmbed[] = [
		buildCommentEmbed(comment, createdOrDeleted, commentColor),
		buildDiscussionEmbed(discussion, repository),
	];

	await postToDiscord(embeds, env);
}
