import { ghostUser, orphanedRepository } from "./constants";
import { handleResponseError } from "./handlers/response-error";
import type {
	GitHubAnnotation,
	GitHubRepository,
	GitHubUser,
	PullRequestAction,
	Step,
} from "./types/github";
import type { BaseEventPayload } from "./types/github-events";
import {
	type GitHubEvent,
	githubSupportedEvents,
	type InstallationToken,
} from "./types/types";

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

export function getWorkflowJobSteps(steps: Step[] | null): Step[] | undefined {
	const relevantSteps = steps?.flatMap((step) => {
		if (step.conclusion === "cancelled" || step.conclusion === "failure")
			return step;
		else return [];
	});
	return relevantSteps;
}

export async function getAnnotations(
	installationToken: InstallationToken,
	checkRunUrl: string,
): Promise<GitHubAnnotation[]> {
	const response = await fetch(`${checkRunUrl}/annotations`, {
		headers: {
			"Authorization": `Bearer ${installationToken}`,
			"Accept": "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "github-discord-notification/1.0.0",
		},
	});

	await handleResponseError(response);

	const annotations = (await response.json()) as GitHubAnnotation[];
	const relevantAnnotations = annotations.flatMap((annotation) => {
		if (annotation.annotation_level === "failure") return annotation;
		else return [];
	});
	return relevantAnnotations;
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

export function prActionText(action: PullRequestAction): string {
	switch (action) {
		case "opened":
			return "opened a pull request";
		case "reopened":
			return "reopened a pull request";
		case "closed":
			return "closed the pull request";
		case "synchronize":
			return "updated the pull request";
		case "review_requested":
			return "requested a review";
		case "ready_for_review":
			return "marked the pull request as `ready for review`";
		case "review_request_removed":
			return "removed a review request";
	}
}
