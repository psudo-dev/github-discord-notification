const colorNames = [
	"issue",
	"pull_request",
	"discussion",
	"star",
	"fork",
	"resolved",
	"attention",
	"failure",
	"dismissed",
] as const;

export type ColorName = (typeof colorNames)[number];

export const githubSupportedEvents = [
	"issues",
	"issue_comment",
	"pull_request",
	"pull_request_review",
	"pull_request_review_comment",
	"pull_request_review_thread",
	"discussion",
	"discussion_comment",
	"workflow_job",
	"star",
	"fork",
] as const;

export type GitHubEvent = (typeof githubSupportedEvents)[number];

export type InstallationToken = string;
