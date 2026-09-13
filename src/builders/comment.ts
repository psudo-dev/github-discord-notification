import { ghostUser } from "../constants";
import type { DiscordEmbed } from "../types/discord";
import type { GitHubComment } from "../types/github";
import { truncateText } from "../utils";
import { buildAuthor } from "./utils";

export function buildCommentEmbed(
	comment: GitHubComment,
	title: string,
	color: number,
): DiscordEmbed {
	let user = comment.user;
	if (!user) user = ghostUser;
	return {
		title: `${title}:`,
		description: truncateText(comment.body, 1000),
		color,
		author: buildAuthor(user),
		timestamp: comment.updated_at,
	};
}
