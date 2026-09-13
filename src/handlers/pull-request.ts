import {
	buildPrContent,
	buildPrEmbed,
	buildPrReviewCommentEmbed,
} from "../builders/pull-request";
import { buildAuthor, buildDiffEmbed } from "../builders/utils";
import { allowed_mentions, colorList } from "../constants";
import { postToDiscord } from "../discord";
import type { DiscordEmbed } from "../types/discord";
import { commentActions, pullRequestActions } from "../types/github";
import type {
	BaseEventPayload,
	PullRequestEvent,
	PullRequestReviewCommentEvent,
	PullRequestReviewEvent,
	PullRequestReviewThreadEvent,
} from "../types/github-events";
import {
	basePayloadOrFallback,
	capitalizeText,
	hexToNumber,
	prActionText,
	truncateText,
} from "../utils";

export async function handlePullRequest(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository } = basePayloadOrFallback(payload);
	const { action, pull_request } = payload as PullRequestEvent;
	if (!pullRequestActions.includes(action) || pull_request.draft) return;

	const ghostwriter = env.DISCORD_ROLE_ID;

	const status = prActionText(action);
	const content = buildPrContent(
		pull_request,
		payload,
		pull_request.html_url,
		status,
		ghostwriter,
	);
	await postToDiscord({ content }, env);

	let color: number;
	if (action === "review_requested") color = hexToNumber(colorList.attention);
	else if (action === "closed" || action === "review_request_removed")
		color = hexToNumber(colorList.dismissed);
	else color = hexToNumber(colorList.pull_request);

	const embeds: DiscordEmbed[] = [
		buildPrEmbed(pull_request, repository, color),
	];
	await postToDiscord({ embeds, allowed_mentions }, env);
}

export async function handlePullRequestReview(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository } = basePayloadOrFallback(payload);
	const { action, pull_request, review } = payload as PullRequestReviewEvent;
	if (action !== "submitted" || review.state === "commented") return;

	const ghostwriter = env.DISCORD_ROLE_ID;

	const status = `submitted a pull request review`;
	const content = buildPrContent(
		pull_request,
		payload,
		review.html_url,
		status,
		ghostwriter,
	);
	await postToDiscord({ content }, env);

	let reviewColor: number;
	if (review.state === "approved")
		reviewColor = hexToNumber(colorList.resolved);
	else if (review.state === "changes_requested")
		reviewColor = hexToNumber(colorList.attention);
	else reviewColor = hexToNumber(colorList.dismissed);

	const reviewPost: DiscordEmbed = {
		title: `Review State: ${capitalizeText(review.state)}`,
		description: truncateText(review.body ?? "", 1000),
		color: reviewColor,
		author: buildAuthor(review.user),
		timestamp: review.submitted_at,
	};

	const color = hexToNumber(colorList.pull_request);
	const embeds: DiscordEmbed[] = [
		reviewPost,
		buildPrEmbed(pull_request, repository, color),
	];
	await postToDiscord({ embeds, allowed_mentions }, env);
}

export async function handlePullRequestReviewComment(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository } = basePayloadOrFallback(payload);
	const { action, pull_request, comment } =
		payload as PullRequestReviewCommentEvent;
	if (!commentActions.includes(action)) return;

	const ghostwriter = env.DISCORD_ROLE_ID;

	const color = hexToNumber(colorList.pull_request);
	let createdOrDeleted: string;
	let commentColor: number;
	if (action === "created") {
		createdOrDeleted = "commented";
		commentColor = hexToNumber(colorList.pull_request);
	} else {
		createdOrDeleted = "deleted his comment";
		commentColor = hexToNumber(colorList.dismissed);
	}

	const prChangesUrl = `${pull_request.html_url}/changes`;
	const status = `${createdOrDeleted} on a pull request review`;

	const content = buildPrContent(
		pull_request,
		payload,
		prChangesUrl,
		status,
		ghostwriter,
	);
	await postToDiscord({ content }, env);

	const embeds: DiscordEmbed[] = [
		buildPrEmbed(pull_request, repository, color),
		buildPrReviewCommentEmbed(comment, createdOrDeleted, commentColor),
		...buildDiffEmbed(comment.diff_hunk, comment.updated_at),
	];
	await postToDiscord({ embeds, allowed_mentions }, env);
}

export async function handlePullRequestReviewThread(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository } = basePayloadOrFallback(payload);
	const { action, pull_request, thread, updated_at } =
		payload as PullRequestReviewThreadEvent;
	const { comments } = thread;

	const ghostwriter = env.DISCORD_ROLE_ID;

	const prChangesUrl = `${pull_request.html_url}/changes`;
	const status = `marked a pull request review thread as ${action}.\nThis thread has **${comments.length} ${comments.length === 1 ? "comment" : "comments"}**`;

	const content = buildPrContent(
		pull_request,
		payload,
		prChangesUrl,
		status,
		ghostwriter,
	);
	await postToDiscord({ content }, env);

	const threadColor =
		action === "resolved"
			? hexToNumber(colorList.resolved)
			: hexToNumber(colorList.dismissed);
	const color = hexToNumber(colorList.pull_request);

	const reviewComment = comments[0];
	const reviewTitle = "review comment";

	let lastCommentEmbed: DiscordEmbed[] = [];
	if (comments.length > 1) {
		const lastComment = comments[comments.length - 1];
		const lastCommentTitle = "last comment";

		lastCommentEmbed = [
			buildPrReviewCommentEmbed(lastComment, lastCommentTitle, threadColor),
		];
	}

	const embeds: DiscordEmbed[] = [
		buildPrEmbed(pull_request, repository, color),
		buildPrReviewCommentEmbed(reviewComment, reviewTitle, threadColor),
		...lastCommentEmbed,
		...buildDiffEmbed(reviewComment.diff_hunk, updated_at),
	];
	await postToDiscord({ embeds, allowed_mentions }, env);
}
