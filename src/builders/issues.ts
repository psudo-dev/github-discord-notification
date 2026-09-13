import type { DiscordEmbed, DiscordField } from "../types/discord";
import type { GitHubIssue, GitHubRepository } from "../types/github";
import { capitalizeText, truncateText } from "../utils/utils";
import { buildAuthor, buildRepositoryField } from "./utils";

export function buildIssueEmbed(
	issue: GitHubIssue,
	repository: GitHubRepository,
	color: number,
): DiscordEmbed {
	const title = `(#${issue.number}) ${issue.title}`;
	const name = issue.pull_request ? "Pull-Request" : "Issue";
	const issueField: DiscordField = {
		name: name,
		value: `#${issue.number}`,
		inline: true,
	};
	const stateField: DiscordField = {
		name: "State",
		value: `${capitalizeText(issue.state)}`,
		inline: true,
	};

	return {
		title: truncateText(title, 250),
		description: truncateText(issue.body ?? "", 1000),
		color,
		fields: [buildRepositoryField(repository), issueField, stateField],
		author: buildAuthor(issue.user),
		timestamp: issue.created_at,
	};
}
