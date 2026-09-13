import { colorList } from "../constants";
import type { DiscordEmbed, DiscordField } from "../types/discord";
import type { GitHubDiscussion, GitHubRepository } from "../types/github";
import { hexToNumber, truncateText } from "../utils";
import { buildAuthor, buildRepositoryField } from "./utils";

export function buildDiscussionEmbed(
	discussion: GitHubDiscussion,
	repository: GitHubRepository,
): DiscordEmbed {
	const discussionField: DiscordField = {
		name: "Discussion",
		value: `#${discussion.number}`,
		inline: true,
	};
	const discussionCategory: DiscordField = {
		name: "Category",
		value: `${discussion.category.name}`,
		inline: true,
	};
	return {
		title: `(#${discussion.number}) ${discussion.title}`,
		description: truncateText(discussion.body ?? "", 1000),
		color: hexToNumber(colorList.discussion),
		fields: [
			buildRepositoryField(repository),
			discussionField,
			discussionCategory,
		],
		author: buildAuthor(discussion.user),
		timestamp: discussion.created_at,
	};
}
