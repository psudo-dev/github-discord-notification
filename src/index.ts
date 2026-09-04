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

function hexToNumber(hex: string): number {
	return parseInt(hex.replace("#", ""), 16);
}

const colorList: Record<ColorName, string> = {
	issue: "#AB80FF",
	pull_request: "#FF4AC3",
	discussion: "#2EE6B2",
	star: "#FFD500",
	watch: "#3AECEC",
	fork: "#50B6FF",
	checked: "#51D936",
	attention: "#FF9925",
	failure: "#F22468",
	dismissed: "#A6ADB6",
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
	starred_at: string | null;
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

interface DiscordField {
	name: string;
	value: string;
	inline?: boolean;
}

interface DiscordAuthor {
	name: string;
	url: string;
	icon_url: string;
}
interface DiscordEmbed {
	title: string;
	description?: string;
	color: number;
	fields?: DiscordField[];
	author: DiscordAuthor;
	timestamp: string;
}
interface DiscordPost {
	content?: string;
	embeds?: DiscordEmbed[];
	allowed_mentions?: { parse: [] };
}

async function fetchToDiscord(body: string, url: string): Promise<Response> {
	return await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: body,
	});
}

async function postToDiscord(
	discordPost: DiscordPost,
	env: Env,
): Promise<void> {
	const body = JSON.stringify(discordPost);
	const url = env.DISCORD_WEBHOOK_URL;
	let response = await fetchToDiscord(body, url);
	let retries = 5;
	while (response.status === 429 && retries > 0) {
		const retryAfter = response.headers.get("Retry-After");
		const wait = retryAfter ? parseFloat(retryAfter) * 1000 : 5000;
		await new Promise((resolve) => setTimeout(resolve, wait));
		response = await fetchToDiscord(body, url);
		retries--;
	}
	if (!response.ok) {
		const error = (await response.json()) as { message: string };
		throw new Error(
			`Discord API Error [${response.status}]: ${error.message}`,
		);
	}
}

const page404 = "https://github.com/404.html";
const ghostPage = "https://github.com/Ghost";

const orphanRepository = "orphaned-repository";

const ghostUser: User = {
	avatar_url: `${ghostPage}.png`,
	html_url: ghostPage,
	login: "ghost-user",
};

const nullRepository: Repository = {
	name: orphanRepository,
	full_name: `${ghostUser.login}/${orphanRepository}`,
	owner: ghostUser,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	html_url: page404,
	private: false,
	stargazers_count: 0,
	stargazers_url: page404,
	subscribers_count: 0,
	subscribers_url: page404,
};

function buildRepositoryField(repository: Repository): DiscordField {
	return {
		name: "Repository",
		value: `[${repository.full_name}](${repository.html_url})`,
	};
}

function buildAuthor(user: User): DiscordAuthor {
	return {
		name: user.login,
		url: user.html_url,
		icon_url: user.avatar_url,
	};
}

async function handleStar(payload: unknown, env: Env): Promise<void> {
	let { action, repository, sender, starred_at } = payload as StarEvent;
	const ghostwriter = env.DISCORD_ROLE_ID;

	if (!repository) repository = nullRepository;
	if (!sender) sender = ghostUser;
	if (!starred_at) starred_at = new Date().toISOString();
	let content: string;
	let title: string;
	let color: number;

	if (action === "created") {
		content = `Your repository **${repository.name}** got a ⭐!\n${ghostwriter}`;
		title = `${repository.name} has ${repository.stargazers_count} stars!`;
		color = hexToNumber(colorList.star);
	} else {
		content = `Your repository **${repository.name}** lost a ⭐\n${ghostwriter}`;
		title = `${repository.name} has \`-1\` star...`;
		color = hexToNumber(colorList.dismissed);
	}

	const starsField: DiscordField = {
		name: "Stars",
		value: `${repository.stargazers_count}`,
		inline: true,
	};
	const stargazersField: DiscordField = {
		name: "Stargazers",
		value: `[Direct link](${repository.stargazers_url})`,
		inline: true,
	};
	const embeds: DiscordEmbed[] = [
		{
			title: title,
			color: color,
			fields: [
				buildRepositoryField(repository),
				starsField,
				stargazersField,
			],
			author: buildAuthor(sender),
			timestamp: starred_at,
		},
	];

	await postToDiscord({ content }, env);
	await postToDiscord({ embeds }, env);
}

async function processEvent(
	event: GitHubEvent,
	body: string,
	env: Env,
): Promise<void> {
	const payload = JSON.parse(body);
	switch (event) {
		case "issues":
			console.log("Received event:", event);
			break;
		case "issue_comment":
			console.log("Received event:", event);
			break;
		case "pull_request":
			console.log("Received event:", event);
			break;
		case "pull_request_review":
			console.log("Received event:", event);
			break;
		case "pull_request_review_comment":
			console.log("Received event:", event);
			break;
		case "discussion":
			console.log("Received event:", event);
			break;
		case "discussion_comment":
			console.log("Received event:", event);
			break;
		case "workflow_job":
			console.log("Received event:", event);
			break;
		case "star":
			await handleStar(payload, env);
			break;
		case "watch":
			console.log("Received event:", event);
			break;
		case "fork":
			console.log("Received event:", event);
			break;
	}
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
