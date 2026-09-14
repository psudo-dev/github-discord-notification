import type { DiscordEmbed, DiscordField } from "../types/discord";
import type {
	GitHubComment,
	GitHubIssue,
	GitHubPullRequest,
	GitHubRepository,
} from "../types/github";
import type { BaseEventPayload } from "../types/github-events";
import {
	basePayloadOrFallback,
	capitalizeText,
	formatText,
	noLinkPreview,
	truncateText,
} from "../utils/utils";
import { buildAuthor, buildRepositoryField } from "./utils";

export function buildPrContent(
	subject: GitHubIssue | GitHubPullRequest,
	payload: BaseEventPayload,
	url: string,
	status: string,
	discordRole: string,
): string {
	const { repository, sender } = basePayloadOrFallback(payload);
	const content = `
		**[PR #${subject.number}] ${repository.full_name}**
		_ _
		**Title**: **${noLinkPreview(subject.title, url, true)}**
		_ _
		**${noLinkPreview(sender.login, sender.html_url)}** ${status}.
		${discordRole}
		`;
	return formatText(content);
}

export function buildPrEmbed(
	pull_request: GitHubPullRequest,
	repository: GitHubRepository,
	color: number,
): DiscordEmbed {
	const baseField: DiscordField = {
		name: "Base",
		value: `${pull_request.base.label}`,
		inline: true,
	};
	const headField: DiscordField = {
		name: "Head",
		value: `${pull_request.head.label}`,
		inline: true,
	};
	const prField: DiscordField = {
		name: "Pull Request",
		value: `#${pull_request.number}`,
		inline: true,
	};
	const prState: DiscordField = {
		name: "State",
		value: `${capitalizeText(pull_request.state)}`,
		inline: true,
	};

	const title = `(#${pull_request.number}) ${pull_request.title}`;
	return {
		title: truncateText(title, 250),
		description: truncateText(pull_request.body ?? "", 1000),
		color,
		fields: [
			baseField,
			headField,
			buildRepositoryField(repository),
			prField,
			prState,
		],
		author: buildAuthor(pull_request.user),
		timestamp: pull_request.created_at,
	};
}

export function buildPrReviewCommentEmbed(
	comment: GitHubComment,
	title: string,
	color: number,
): DiscordEmbed {
	const file = comment.path ? `${comment.path.split("/").pop()}` : "[no file]";

	const fileField: DiscordField = {
		name: "File",
		value: file,
		inline: true,
	};

	let line: string;
	const commentLine = comment.line ?? comment.original_line;
	const commentStartLine = comment.start_line ?? comment.original_start_line;

	if (comment.subject_type === "file") line = "File Level";
	else if (commentStartLine) line = `${commentStartLine}-${commentLine}`;
	else line = `${commentLine}`;

	const lineField: DiscordField = {
		name: "Line Range",
		value: line,
		inline: true,
	};

	return {
		title: `${title}:`,
		description: `${truncateText(comment.body, 1000)}`,
		color,
		fields: [fileField, lineField],
		author: buildAuthor(comment.user),
		timestamp: comment.updated_at,
	};
}
