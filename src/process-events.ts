import {
	handleDiscussion,
	handleDiscussionComment,
} from "./handlers/discussion";
import { handleFork } from "./handlers/fork";
import { handleIssueComment, handleIssues } from "./handlers/issues";
import {
	handlePullRequest,
	handlePullRequestReview,
	handlePullRequestReviewComment,
	handlePullRequestReviewThread,
} from "./handlers/pull-request";
import { handleStar } from "./handlers/star";
import { handleWorkflowJob } from "./handlers/workflow-job";
import type { BaseEventPayload } from "./types/github-events";
import type { GitHubEvent } from "./types/types";

export async function processEvents(
	event: GitHubEvent,
	rawBody: string,
	env: Env,
): Promise<void> {
	const payload = JSON.parse(rawBody) as BaseEventPayload;
	const ImTheTrigger =
		payload.sender?.login === payload.repository?.owner?.login;

	if (ImTheTrigger && event !== "workflow_job") return;

	switch (event) {
		case "issues":
			await handleIssues(payload, env);
			break;
		case "issue_comment":
			await handleIssueComment(payload, env);
			break;
		case "pull_request":
			await handlePullRequest(payload, env);
			break;
		case "pull_request_review":
			await handlePullRequestReview(payload, env);
			break;
		case "pull_request_review_comment":
			await handlePullRequestReviewComment(payload, env);
			break;
		case "pull_request_review_thread":
			await handlePullRequestReviewThread(payload, env);
			break;
		case "discussion":
			await handleDiscussion(payload, env);
			break;
		case "discussion_comment":
			await handleDiscussionComment(payload, env);
			break;
		case "workflow_job":
			await handleWorkflowJob(payload, env);
			break;
		case "star":
			await handleStar(payload, env);
			break;
		case "fork":
			await handleFork(payload, env);
			break;
	}
}
