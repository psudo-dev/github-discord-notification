async function verifySignature(
	secret: string,
	body: string,
	signature: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const algorithm = { name: "HMAC", hash: "SHA-256" };
	const extractable = false;
	const keyBytes = encoder.encode(secret); // Uint8Array encoded using UTF-8

	const key: CryptoKey = await crypto.subtle.importKey(
		"raw", // bytes
		keyBytes,
		algorithm,
		extractable,
		["sign"], // sign, !verify
	);

	// Message Authentication Code
	const mac: ArrayBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(body),
	);

	const expected: string =
		"sha256=" +
		Array.from(new Uint8Array(mac))
			.map((byte) => byte.toString(16).padStart(2, "0")) // HEX < 16 adds 0
			.join("");

	const a = encoder.encode(expected);
	const b = encoder.encode(signature);
	if (a.byteLength !== b.byteLength) return false;
	return crypto.subtle.timingSafeEqual(a, b);
}

const eventActionPair: Record<GitHubEvent, Partial<Action>[]> = {
	issues: ["opened", "reopened", "deleted", "closed"],
	issue_comment: ["created", "deleted"],
	pull_request: [
		"opened",
		"ready_for_review",
		"reopened",
		"synchronize",
		"review_requested",
		"review_request_removed",
		"closed",
	],
	pull_request_review: ["submitted", "dismissed"],
	pull_request_review_comment: ["created", "deleted"],
	discussion: ["created", "deleted", "answered", "unanswered"],
	discussion_comment: ["created", "deleted"],
	workflow_job: ["completed"],
	star: ["created", "deleted"],
	watch: ["started"],
	fork: [],
};

type Selected<T, U extends T> = U;

const colorNames = [
	"issue",
	"pull_request",
	"discussion",
	"star",
	"watch",
	"fork",
	"checked",
	"attention",
	"failure",
	"dismissed",
] as const;

type ColorName = (typeof colorNames)[number];

const color: Record<ColorName, number> = {
	issue: 11239679,
	pull_request: 16730819,
	discussion: 3073714,
	star: 16766208,
	watch: 3861740,
	fork: 5289727,
	checked: 5364022,
	attention: 16750885,
	failure: 15869032,
	dismissed: 10923446,
};

const githubSupportedEvents = [
	"issues",
	"issue_comment",
	"pull_request",
	"pull_request_review",
	"pull_request_review_comment",
	"discussion",
	"discussion_comment",
	"workflow_job",
	"star",
	"watch",
	"fork",
] as const;

type GitHubEvent = (typeof githubSupportedEvents)[number];

function isSupportedEvent(event: unknown): event is GitHubEvent {
	return (
		typeof event === "string" &&
		githubSupportedEvents.includes(event as GitHubEvent)
	);
}

const eventAction = [
	"opened",
	"reopened",
	"deleted",
	"closed",
	"created",
	"ready_for_review",
	"synchronize",
	"review_requested",
	"review_request_removed",
	"submitted",
	"dismissed",
	"answered",
	"unanswered",
	"completed",
	"started",
] as const;

type Action = (typeof eventAction)[number];

const possibleStates = [
	"open",
	"closed",
	"approved",
	"changes_requested",
	"commented",
	"dismissed",
	"locked",
	"converting",
	"transferring",
] as const;

type State = (typeof possibleStates)[number];

interface IssuePullRequest {
	html_url: string;
}
interface Issue {
	title: string;
	body: string | null;
	html_url: string;
	number: number;
	state: Selected<State, "open" | "closed">;
	created_at: string;
	updated_at: string;
	user: User | null;
	pull_request?: IssuePullRequest;
}
interface User {
	avatar_url: string;
	html_url: string;
	login: string;
}
interface Repository {
	name: string;
	full_name: string;
	owner: User;
	created_at: string;
	updated_at: string;
	html_url: string;
	private: boolean;
	stargazers_count: number;
	stargazers_url: string;
	subscribers_count: number;
	subscribers_url: string;
}
interface IssuesEvent {
	action: Selected<Action, "opened" | "reopened" | "deleted" | "closed">;
	repository: Repository | null;
	sender: User | null;
	issue: Issue;
}

interface Comment {
	body: string;
	html_url: string;
	issue_url: string;
	updated_at: string;
	user: User | null;
	diff_hunk?: string | null;
	subject_type?: "line" | "file";
	line?: number | null;
	path?: string;
}
interface IssueCommentEvent {
	action: Selected<Action, "created" | "deleted">;
	repository: Repository | null;
	sender: User | null;
	issue: Issue;
	comment: Comment;
}

interface PullRequest {
	title: string;
	body: string | null;
	draft: boolean;
	base: { label: string };
	head: { label: string };
	created_at: string;
	updated_at: string;
	html_url: string;
	number: number;
	state: Selected<State, "open" | "closed">;
	user: User | null;
}
interface PullRequestEvent {
	action: Selected<
		Action,
		| "opened"
		| "ready_for_review"
		| "reopened"
		| "synchronize"
		| "review_requested"
		| "review_request_removed"
		| "closed"
	>;
	repository: Repository | null;
	sender: User | null;
	number: number;
	pull_request: PullRequest;
}

interface Review {
	body: string | null;
	html_url: string;
	state: Selected<
		State,
		"approved" | "changes_requested" | "commented" | "dismissed"
	>;
	submitted_at: string;
	updated_at: string | null;
	user: User | null;
}
interface PullRequestReviewEvent {
	action: Selected<Action, "submitted" | "dismissed">;
	repository: Repository | null;
	sender: User | null;
	review: Review;
	pull_request: PullRequest;
}

interface PullRequestReviewCommentEvent {
	action: Selected<Action, "created" | "deleted">;
	repository: Repository | null;
	sender: User | null;
	comment: Comment;
	pull_request: PullRequest;
}

interface Answer {
	body: string;
	html_url: string;
	updated_at: string;
	user: User | null;
}

interface Discussion {
	title: string;
	body: string | null;
	category: { name: string };
	created_at: string;
	updated_at: string;
	html_url: string;
	number: number;
	state: Selected<
		State,
		"open" | "closed" | "locked" | "converting" | "transferring"
	>;
}
interface DiscussionEvent {
	action: Selected<Action, "created" | "deleted" | "answered" | "unanswered">;
	repository: Repository | null;
	sender: User | null;
	answer?: Answer;
	discussion: Discussion;
}

interface DiscussionCommentEvent {
	action: Selected<Action, "created" | "deleted">;
	repository: Repository | null;
	sender: User | null;
	comment: Comment;
	discussion: Discussion;
}

interface Annotation {
	title: string;
	message: string;
	annotation_level: "notice" | "warning" | "failure";
}
interface Steps {
	conclusion: "failure" | "skipped" | "success" | "cancelled" | null;
	name: string;
}
interface WorkflowJob {
	completed_at: string;
	conclusion: "failure" | "cancelled" | "timed_out" | "action_required";
	id: number;
	html_url: string;
	name: string;
	workflow_name: string;
	steps: Steps[] | null;
}
interface WorkflowJobEvent {
	action: Selected<Action, "completed">;
	repository: Repository | null;
	sender: User | null;
	workflow_job: WorkflowJob;
}

interface StarEvent {
	action: Selected<Action, "created" | "deleted">;
	repository: Repository | null;
	sender: User | null;
	starred_at: string | nullz;
}

interface WatchEvent {
	action: Selected<Action, "started">;
	repository: Repository | null;
	sender: User | null;
}

interface ForkEvent {
	repository: Repository | null;
	sender: User | null;
	forkee: Repository | null;
}

async function processEvent(event: GitHubEvent, body: string, env: Env) {
	const payload = JSON.parse(body);
	console.log(payload.action);
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		if (request.method !== "POST")
			return new Response("Method Not Allowed", { status: 405 });
		const secret: string = env.GITHUB_WEBHOOK_SECRET;
		const signature = request.headers.get("X-Hub-Signature-256");
		if (!signature) return new Response("Unauthorized", { status: 401 });

		const body: string = await request.text();
		const valid = await verifySignature(secret, body, signature);
		if (!valid) return new Response("Unauthorized", { status: 401 });

		const deliveryId = request.headers.get("X-GitHub-Delivery");
		if (!deliveryId) return new Response("Bad Request", { status: 400 });

		const seen = await env.KV.get(deliveryId);
		if (seen) return new Response("OK", { status: 200 });

		await env.KV.put(deliveryId, "1", { expirationTtl: 86400 });

		const event = request.headers.get("X-GitHub-Event");
		if (!event) return new Response("Bad Request", { status: 400 });

		if (!isSupportedEvent(event))
			return new Response("OK", { status: 200 });

		ctx.waitUntil(processEvent(event, body, env));

		return new Response("OK", { status: 200 });
	},
};
