import { colorList, ghostUser } from "../constants";
import type {
	DiscordAuthor,
	DiscordEmbed,
	DiscordField,
} from "../types/discord";
import type { GitHubRepository, GitHubUser } from "../types/github";
import { hexToNumber, truncateText } from "../utils";

export function buildRepositoryField(
	repository: GitHubRepository,
): DiscordField {
	return {
		name: "Repository",
		value: `[${repository.full_name}](${repository.html_url})`,
	};
}

export function buildAuthor(user: GitHubUser | null): DiscordAuthor {
	let safeUser: GitHubUser;
	if (!user) safeUser = ghostUser;
	else safeUser = user;
	return {
		name: safeUser.login,
		url: safeUser.html_url,
		icon_url: safeUser.avatar_url,
	};
}

export function buildDiffEmbed(
	diff: string | undefined,
	timestamp: string,
): DiscordEmbed[] {
	if (!diff) return [];
	const description = `\`\`\`diff\n${truncateText(diff, 2000)}\n\`\`\``;
	return [
		{
			title: "pull request review diff:",
			description,
			color: hexToNumber(colorList.pull_request),
			timestamp,
		},
	];
}
