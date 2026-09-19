import type {
	DiscordAuthor,
	DiscordEmbed,
	DiscordField,
} from "../types/discord";
import type {
	GitHubComment,
	GitHubRepository,
	GitHubUser,
} from "../types/github";
import { colorList, ghostUser } from "../utils/constants";
import { hexToNumber, truncateText } from "../utils/utils";

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

	const separator = safeUser.avatar_url.includes("?") ? "&" : "?";

	return {
		name: safeUser.login,
		url: safeUser.html_url,
		icon_url: `${safeUser.avatar_url}${separator}uncache=${Date.now()}`,
	};
}

export function buildCommentDiffEmbed(comment: GitHubComment): DiscordEmbed[] {
	const { diff_hunk, updated_at } = comment;
	if (!diff_hunk) return [];
	const description = `\`\`\`diff\n${truncateText(diff_hunk, 2000)}\n\`\`\``;
	return [
		{
			title: "pull request review diff:",
			description,
			color: hexToNumber(colorList.pull_request),
			timestamp: updated_at,
		},
	];
}
