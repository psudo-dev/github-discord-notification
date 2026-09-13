import type { GitHubRepository, GitHubUser } from "../types/github";
import type { BaseEventPayload } from "../types/github-events";
import { type GitHubEvent, githubSupportedEvents } from "../types/types";
import { ghostUser, orphanedRepository } from "./constants";

export function isSupportedEvent(event: unknown): event is GitHubEvent {
	return (
		typeof event === "string" &&
		githubSupportedEvents.includes(event as GitHubEvent)
	);
}

export function basePayloadOrFallback(payload: BaseEventPayload): {
	repository: GitHubRepository;
	sender: GitHubUser;
} {
	let { repository, sender } = payload;

	if (!repository) repository = orphanedRepository;
	if (!sender) sender = ghostUser;

	return { repository, sender };
}

export function noLinkPreview(
	text: string,
	url: string,
	title?: boolean,
): string {
	if (title) return `["${text}"](<${url}>)`;
	return `[${text}](<${url}>)`;
}

export function formatText(str: string): string {
	return str.replace(/^[ \t]+/gm, "");
}

export function truncateText(str: string, limit: number): string {
	const formatted = str.slice(0, limit);
	if (str.length > limit) return `${formatted} (...)`;
	else return formatted;
}

export function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

export function capitalizeText(str: string | null): string {
	if (str === null) return "Null";
	const underscore = "_";
	let capitalized: string;
	if (str.includes(underscore)) {
		capitalized = str
			.split(underscore)
			.map((word) => capitalize(word))
			.join(" ");
		return capitalized;
	} else {
		capitalized = capitalize(str);
	}
	return capitalized;
}

export function hexToNumber(hex: string): number {
	return parseInt(hex.replace("#", ""), 16);
}
