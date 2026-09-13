import type {
	CommentAction,
	DiscussionAction,
	GitHubAnswer,
	GitHubComment,
	GitHubDiscussion,
	GitHubInstallation,
	GitHubIssue,
	GitHubPullRequest,
	GitHubRepository,
	GitHubReview,
	GitHubUser,
	GitHubWorkflowJob,
	IssuesAction,
	PullRequestAction,
} from "./github";

export interface BaseEventPayload {
	sender: GitHubUser | null;
	repository: GitHubRepository | null;
	installation: GitHubInstallation;
}

export interface IssuesEvent extends BaseEventPayload {
	action: IssuesAction;
	issue: GitHubIssue;
}

export interface IssueCommentEvent extends BaseEventPayload {
	action: CommentAction;
	issue: GitHubIssue;
	comment: GitHubComment;
}

export interface PullRequestEvent extends BaseEventPayload {
	action: PullRequestAction;
	number: number;
	pull_request: GitHubPullRequest;
}

export interface PullRequestReviewEvent extends BaseEventPayload {
	action: "submitted";
	review: GitHubReview;
	pull_request: GitHubPullRequest;
}

export interface PullRequestReviewCommentEvent extends BaseEventPayload {
	action: CommentAction;
	comment: GitHubComment;
	pull_request: GitHubPullRequest;
}

export interface PullRequestReviewThreadEvent extends BaseEventPayload {
	action: "resolved" | "unresolved";
	pull_request: GitHubPullRequest;
	thread: { comments: GitHubComment[] };
	updated_at: string;
}

export interface DiscussionEvent extends BaseEventPayload {
	action: DiscussionAction;
	answer?: GitHubAnswer;
	discussion: GitHubDiscussion;
}

export interface DiscussionCommentEvent extends BaseEventPayload {
	action: CommentAction;
	comment: GitHubComment;
	discussion: GitHubDiscussion;
}

export interface WorkflowJobEvent extends BaseEventPayload {
	action: "completed";
	workflow_job: GitHubWorkflowJob;
}

export interface StarEvent extends BaseEventPayload {
	action: "created" | "deleted";
	starred_at: string | null;
}

export interface ForkEvent extends BaseEventPayload {
	forkee: GitHubRepository | null;
}
