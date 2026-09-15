export interface GitHubUser {
	avatar_url: string;
	html_url: string;
	login: string;
}

export interface GitHubRepository {
	name: string;
	full_name: string;
	owner: GitHubUser;
	created_at: string;
	updated_at: string;
	html_url: string;
	private: boolean;
	forks_count: number;
	stargazers_count: number;
	stargazers_url: string;
}

export interface GitHubAnswer {
	body: string;
	html_url: string;
	updated_at: string;
	user: GitHubUser | null;
}

export interface GitHubInstallation {
	id: number;
	node_id: string;
}

export type OpenClosedState = "open" | "closed";

export type ReviewState = "approved" | "changes_requested" | "commented";

export type DiscussionState =
	| "open"
	| "closed"
	| "locked"
	| "converting"
	| "transferring";

export interface GitHubReview {
	body: string | null;
	html_url: string;
	state: ReviewState;
	submitted_at: string;
	updated_at: string | null;
	user: GitHubUser | null;
}

export interface GitHubAnnotation {
	title: string | null;
	message: string;
	annotation_level: "notice" | "warning" | "failure";
}

export const commentActions = ["created", "deleted"] as const;

export type CommentAction = (typeof commentActions)[number];

export type DiffHunk = string;

export interface GitHubComment {
	body: string;
	html_url: string;
	url: string;
	issue_url: string;
	updated_at: string;
	user: GitHubUser | null;
	diff_hunk?: DiffHunk;
	subject_type?: "line" | "file";
	line?: number | null;
	original_line?: number | null;
	start_line?: number | null;
	original_start_line?: number | null;
	path?: string;
}

export interface IssuePullRequest {
	html_url: string;
}

export const issuesActions = ["opened", "reopened", "closed"] as const;

export type IssuesAction = (typeof issuesActions)[number];

export interface GitHubIssue {
	title: string;
	body: string | null;
	html_url: string;
	number: number;
	state: OpenClosedState;
	created_at: string;
	updated_at: string;
	user: GitHubUser | null;
	pull_request?: IssuePullRequest;
}

export const pullRequestActions = [
	"opened",
	"ready_for_review",
	"reopened",
	"synchronize",
	"review_requested",
	"review_request_removed",
	"closed",
] as const;

export type PullRequestAction = (typeof pullRequestActions)[number];

export interface GitHubPullRequest {
	title: string;
	body: string | null;
	draft: boolean;
	base: { label: string };
	head: { label: string };
	created_at: string;
	updated_at: string;
	html_url: string;
	number: number;
	state: OpenClosedState;
	user: GitHubUser | null;
}

export const discussionActions = [
	"created",
	"answered",
	"unanswered",
	"closed",
] as const;

export type DiscussionAction = (typeof discussionActions)[number];

export interface GitHubDiscussion {
	title: string;
	body: string | null;
	category: { name: string };
	created_at: string;
	updated_at: string;
	html_url: string;
	number: number;
	state: DiscussionState;
	user: GitHubUser | null;
}

export type StepConclusion =
	| "failure"
	| "skipped"
	| "success"
	| "cancelled"
	| null;

export interface Step {
	conclusion: StepConclusion | string;
	name: string;
}

export const workflowJobConclusion = [
	"failure",
	"cancelled",
	"timed_out",
	"action_required",
] as const;

export type WorkflowJobConclusion = (typeof workflowJobConclusion)[number];

export interface GitHubWorkflowJob {
	completed_at: string;
	conclusion: WorkflowJobConclusion;
	check_run_url: string;
	html_url: string;
	name: string;
	workflow_name: string;
	steps: Step[] | null;
}
