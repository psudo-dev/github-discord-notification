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

type Selected<T, U extends T> = U;

const colorNames = [
	"issue",
	"pull_request",
	"discussion",
	"star",
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
	discussion: "#2EE6D7",
	star: "#FFD500",
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

const issueStates = ["open", "closed"] as const;

type IssueState = (typeof issueStates)[number];

interface Issue {
	title: string;
	body: string | null;
	html_url: string;
	number: number;
	state: IssueState;
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
	forks_count: number;
	stargazers_count: number;
	stargazers_url: string;
	subscribers_count: number;
	subscribers_url: string;
}

const issuesActions = ["opened", "reopened", "closed"] as const;

type IssuesAction = (typeof issuesActions)[number];
interface IssuesEvent extends BaseEventPayload {
	action: IssuesAction;
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

const issueCommentActions = ["created", "deleted"] as const;

type IssueCommentAction = (typeof issueCommentActions)[number];

interface IssueCommentEvent extends BaseEventPayload {
	action: IssueCommentAction;
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
interface PullRequestEvent extends BaseEventPayload {
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
interface PullRequestReviewEvent extends BaseEventPayload {
	action: Selected<Action, "submitted" | "dismissed">;
	review: Review;
	pull_request: PullRequest;
}

interface PullRequestReviewCommentEvent extends BaseEventPayload {
	action: Selected<Action, "created" | "deleted">;
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
interface DiscussionEvent extends BaseEventPayload {
	action: Selected<Action, "created" | "deleted" | "answered" | "unanswered">;
	answer?: Answer;
	discussion: Discussion;
}

interface DiscussionCommentEvent extends BaseEventPayload {
	action: Selected<Action, "created" | "deleted">;
	comment: Comment;
	discussion: Discussion;
}

interface Annotation {
	title: string | null;
	message: string;
	annotation_level: "notice" | "warning" | "failure";
}

const stepConclusions = [
	"failure",
	"skipped",
	"success",
	"cancelled",
	null,
] as const;

type StepConclusion = (typeof stepConclusions)[number];

interface Step {
	conclusion: StepConclusion | string;
	name: string;
}

const workflowJobConclusion = [
	"failure",
	"cancelled",
	"timed_out",
	"action_required",
] as const;

type WorkflowJobConclusion = (typeof workflowJobConclusion)[number];

interface WorkflowJob {
	completed_at: string;
	conclusion: WorkflowJobConclusion;
	id: number;
	html_url: string;
	name: string;
	workflow_name: string;
	steps: Step[] | null;
}

interface Installation {
	id: number;
	node_id: string;
}

interface WorkflowJobEvent extends BaseEventPayload {
	action: "completed";
	workflow_job: WorkflowJob;
	installation: Installation;
}

interface StarEvent extends BaseEventPayload {
	action: "created" | "deleted";
	starred_at: string | null;
}

interface ForkEvent extends BaseEventPayload {
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

interface DiscordMentionsNone {
	parse: [];
}
interface DiscordPost {
	content?: string;
	embeds?: DiscordEmbed[];
	allowed_mentions?: DiscordMentionsNone;
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
	await handleResponseError(response);
}

const page404 = "https://github.com/404.html";
const ghostPage = "https://github.com/Ghost";

const orphanedRepoName = "orphaned-repository";

const ghostUser: User = {
	avatar_url: `${ghostPage}.png`,
	html_url: ghostPage,
	login: "ghost-user",
};

const orphanedRepository: Repository = {
	name: orphanedRepoName,
	full_name: `${ghostUser.login}/${orphanedRepoName}`,
	owner: ghostUser,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	html_url: page404,
	private: false,
	forks_count: 0,
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

function buildAuthor(user: User | null): DiscordAuthor {
	let safeUser: User;
	if (!user) safeUser = ghostUser;
	else safeUser = user;
	return {
		name: safeUser.login,
		url: safeUser.html_url,
		icon_url: safeUser.avatar_url,
	};
}

const allowed_mentions: DiscordMentionsNone = { parse: [] };

async function handleStar(payload: BaseEventPayload, env: Env): Promise<void> {
	const { repository, sender } = basePayloadFallback(payload);
	let { action, starred_at } = payload as StarEvent;
	const ghostwriter = env.DISCORD_ROLE_ID;

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
			fields: [buildRepositoryField(repository), starsField, stargazersField],
			author: buildAuthor(sender),
			timestamp: starred_at,
		},
	];

	await postToDiscord({ content }, env);
	await postToDiscord({ embeds, allowed_mentions }, env);
}

const stepFallback: Step = {
	conclusion: "No Conclusion",
	name: "No Step",
};

function getStepsOrFallback(steps: Step[] | null): Step[] {
	const relevantSteps = steps?.flatMap((step) => {
		if (step.conclusion === "cancelled" || step.conclusion === "failure")
			return step;
		else return [];
	});
	return relevantSteps ? relevantSteps : [stepFallback];
}

function toBase64Url(data: string): string {
	const base64 = btoa(data); // Byte Char to ASCII
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function pemToDer(base64: string): ArrayBuffer {
	const binary = atob(base64); // ASCII to Byte Char
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i); // Byte Char to 0-255
	}
	return bytes.buffer;
}

type InstallationToken = string;

async function getInstallationToken(
	installationId: number,
	jwt: string,
): Promise<InstallationToken> {
	const response = await fetch(
		`https://api.github.com/app/installations/${installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				"Authorization": `Bearer ${jwt}`,
				"Accept": "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"User-Agent": "github-discord-notification/1.0.0",
			},
		},
	);

	await handleResponseError(response);

	const data = (await response.json()) as { token: InstallationToken };
	return data.token;
}

async function handleResponseError(response: Response): Promise<void> {
	if (!response.ok) {
		const text = await response.text();
		let body: string;
		try {
			body = JSON.stringify(JSON.parse(text));
		} catch {
			body = text;
		}
		throw new Error(
			`GitHub API [${response.status} | ${response.statusText}]: ${body}`,
		);
	}
}

const annotationFallback: Annotation = {
	title: "[No Title]",
	message: "[No Message]",
	annotation_level: "failure",
};

async function getAnnotationsOrFallback(
	installationToken: InstallationToken,
	repositoryFullName: string,
	workflowJobId: number,
): Promise<Annotation[]> {
	const response = await fetch(
		`https://api.github.com/repos/${repositoryFullName}/check-runs/${workflowJobId}/annotations`,
		{
			headers: {
				"Authorization": `Bearer ${installationToken}`,
				"Accept": "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"User-Agent": "github-discord-notification/1.0.0",
			},
		},
	);

	await handleResponseError(response);

	const annotations = (await response.json()) as Annotation[];
	const relevantAnnotations = annotations.flatMap((annotation) => {
		if (annotation.annotation_level === "failure") return annotation;
		else return [];
	});
	const result =
		relevantAnnotations.length > 0 ? relevantAnnotations : [annotationFallback];

	return result;
}

function generateHeaderAndPayload(env: Env): string {
	const header = { alg: "RS256", typ: "JWT" };
	const headerJson = JSON.stringify(header);
	const payload = {
		iat: Math.floor(Date.now() / 1000) - 60, // minus 60s
		exp: Math.floor(Date.now() / 1000) + 600, // 10 min
		iss: env.GITHUB_APP_ID,
	};
	const payloadJson = JSON.stringify(payload);

	return `${toBase64Url(headerJson)}.${toBase64Url(payloadJson)}`;
}

async function generateJwt(
	headerAndPayload: string,
	env: Env,
): Promise<string> {
	const encoder = new TextEncoder();
	const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
	const extractable = false;

	const key: CryptoKey = await crypto.subtle.importKey(
		"pkcs8", // format standard
		pemToDer(env.GITHUB_PRIVATE_KEY), // in bytes
		algorithm,
		extractable,
		["sign"], // sign, !verify
	);

	const signatureBuffer: ArrayBuffer = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		encoder.encode(headerAndPayload),
	);

	const data: string = String.fromCharCode(...new Uint8Array(signatureBuffer));
	const signature: string = toBase64Url(data);

	const jwt = `${headerAndPayload}.${signature}`;
	return jwt;
}

async function handleWorkflowJob(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadFallback(payload);
	const { action, workflow_job, installation } = payload as WorkflowJobEvent;

	if (action !== "completed") return;
	if (!workflowJobConclusion.includes(workflow_job.conclusion)) return;
	const ghostwriter = env.DISCORD_ROLE_ID;

	const relevantSteps: Step[] = getStepsOrFallback(workflow_job.steps);
	const formattedSteps = relevantSteps
		.map(
			(step) =>
				`**Step**: ${step.name}\n**Status**: ${capitalizeText(step.conclusion)}`,
		)
		.join("\n");

	const contentDraft = `
	**[actions: ${workflow_job.conclusion}] ${repository.full_name}**
	_ _
	**Workflow**: ${workflow_job.workflow_name}
	**Job**: ${workflow_job.name}
	${formattedSteps}
	_ _
	Check the **workflow/job**'s page ${noLinkPreview("here", workflow_job.html_url)}!
	${ghostwriter}
	`;
	const content = formatText(contentDraft);

	const headerAndPayload: string = generateHeaderAndPayload(env);
	const jwt: string = await generateJwt(headerAndPayload, env);
	const installationToken: string = await getInstallationToken(
		installation.id,
		jwt,
	);
	const annotations: Annotation[] = await getAnnotationsOrFallback(
		installationToken,
		repository.full_name,
		workflow_job.id,
	);

	const embeds = annotations.map((annotation) => {
		const title = annotation.title ? annotation.title : "";
		const description = truncateText(annotation.message, 4000);
		const embed: DiscordEmbed = {
			title: title,
			description: description,
			color: hexToNumber(colorList.failure),
			fields: [buildRepositoryField(repository)],
			author: buildAuthor(sender),
			timestamp: workflow_job.completed_at,
		};
		return embed;
	});

	await postToDiscord({ content }, env);
	for (const embed of embeds) {
		await postToDiscord({ embeds: [embed], allowed_mentions }, env);
	}
}

function noLinkPreview(text: string, url: string): string {
	return `[${text}](<${url}>)`;
}

function formatText(str: string): string {
	return str.replace(/^[ \t]+/gm, "");
}

function truncateText(str: string, limit: number): string {
	const formatted = str.slice(0, limit);
	if (str.length > limit) return `${formatted}...`;
	else return formatted;
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function capitalizeText(str: string | null): string {
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

function basePayloadFallback(payload: BaseEventPayload): {
	repository: Repository;
	sender: User;
} {
	let { repository, sender } = payload;

	if (!repository) repository = orphanedRepository;
	if (!sender) sender = ghostUser;

	return { repository, sender };
}

async function handleFork(payload: BaseEventPayload, env: Env): Promise<void> {
	const { repository, sender } = basePayloadFallback(payload);
	let { forkee } = payload as ForkEvent;
	if (!forkee) forkee = orphanedRepository;
	const ghostwriter = env.DISCORD_ROLE_ID;

	const content = `**${sender.login}** forked **${repository.full_name}**!\n${ghostwriter}`;

	const title = `forked ${repository.name}`;
	const draftDescription = `
	**URL**: ${noLinkPreview(forkee.full_name, forkee.html_url)}
	**Visibility**: ${repository.private ? "Private" : "Public"}
	`;
	const description = formatText(draftDescription);
	const color = hexToNumber(colorList.fork);
	const fields: DiscordField[] = [
		{
			name: "Forked Repository",
			value: `[${repository.name}](<${repository.html_url}>)`,
		},
		{
			name: "Forks Count",
			value: `${repository.forks_count}`,
		},
	];
	const embeds: DiscordEmbed[] = [
		{
			title,
			description,
			color,
			fields,
			author: buildAuthor(sender),
			timestamp: forkee.created_at,
		},
	];

	await postToDiscord({ content }, env);
	await postToDiscord({ embeds, allowed_mentions }, env);
}

function buildIssueEmbed(
	issue: Issue,
	repository: Repository,
	color: number,
): DiscordEmbed {
	const title = `(#${issue.number}) ${issue.title}`;
	const description = issue.body ? issue.body : "[No Message]";
	const name = issue.pull_request ? "Pull-Request" : "Issue";
	const issueField: DiscordField = {
		name: name,
		value: `#${issue.number}`,
		inline: true,
	};
	const stateField: DiscordField = {
		name: "State",
		value: `${capitalizeText(issue.state)}`,
		inline: true,
	};

	return {
		title: truncateText(title, 250),
		description: truncateText(description, 4000),
		color: color,
		fields: [buildRepositoryField(repository), issueField, stateField],
		author: buildAuthor(issue.user),
		timestamp: issue.created_at,
	};
}

async function handleIssues(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadFallback(payload);
	const { action, issue } = payload as IssuesEvent;
	if (!issuesActions.includes(action)) return;
	const ghostwriter = env.DISCORD_ROLE_ID;

	const draftContent = `
	**[issue #${issue.number}] ${repository.full_name}**
	_ _
	The issue **${noLinkPreview(issue.title, issue.html_url)}** has been **${action}** by **${noLinkPreview(sender.login, sender.html_url)}**.
	${ghostwriter}
	`;
	const content = formatText(draftContent);
	let color: number;
	if (action === "opened" || action === "reopened")
		color = hexToNumber(colorList.issue);
	else color = hexToNumber(colorList.dismissed);
	const embeds: DiscordEmbed[] = [buildIssueEmbed(issue, repository, color)];

	await postToDiscord({ content }, env);
	await postToDiscord({ embeds, allowed_mentions }, env);
}

function buildCommentEmbed(comment: Comment, color: number): DiscordEmbed {
	let user = comment.user;
	if (!user) user = ghostUser;
	const description = truncateText(comment.body, 4000);
	return {
		title: `${user.login} commented:`,
		description,
		color,
		author: buildAuthor(user),
		timestamp: comment.updated_at,
	};
}

async function handleIssueComment(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadFallback(payload);
	const { action, issue, comment } = payload as IssueCommentEvent;
	if (!issueCommentActions.includes(action)) return;
	const ghostwriter = env.DISCORD_ROLE_ID;
	let content: string;
	let color: number;
	if (!issue.pull_request) {
		const draftContent = `
		**[issue #${issue.number}] ${repository.full_name}**
		_ _
		**${noLinkPreview(sender.login, sender.html_url)}** commented on ${noLinkPreview(issue.title, comment.html_url)}.
		${ghostwriter}
		`;
		content = formatText(draftContent);
		color = hexToNumber(colorList.issue);
	} else {
		const draftContent = `
		**[PR #${issue.number}] ${repository.full_name}**
		_ _
		**${noLinkPreview(issue.title, comment.html_url)}**
		_ _
		**${noLinkPreview(sender.login, sender.html_url)}**:_ _commented on the pull request thread.
		${ghostwriter}
		`;
		content = formatText(draftContent);
		color = hexToNumber(colorList.pull_request);
	}
	if (action === "deleted") color = hexToNumber(colorList.dismissed);
	const commentPost: DiscordPost = {
		embeds: [buildCommentEmbed(comment, color)],
		allowed_mentions,
	};
	const issuePost: DiscordPost = {
		embeds: [buildIssueEmbed(issue, repository, color)],
		allowed_mentions,
	};

	await postToDiscord({ content }, env);
	await postToDiscord(commentPost, env);
	await postToDiscord(issuePost, env);
}

interface BaseEventPayload {
	sender: User | null;
	repository: Repository | null;
}

async function processEvents(
	event: GitHubEvent,
	rawBody: string,
	env: Env,
): Promise<void> {
	const payload = JSON.parse(rawBody) as BaseEventPayload;
	const ImTheTrigger =
		payload.sender?.login === payload.repository?.owner?.login;

	// if (ImTheTrigger && event !== "workflow_job") return;

	switch (event) {
		case "issues":
			await handleIssues(payload, env);
			break;
		case "issue_comment":
			await handleIssueComment(payload, env);
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

		const rawBody: string = await request.text();
		const valid = await verifySignature(secret, rawBody, signature);
		if (!valid) return new Response("Unauthorized", { status: 401 });

		const deliveryId = request.headers.get("X-GitHub-Delivery");
		if (!deliveryId) return new Response("Bad Request", { status: 400 });

		const seen = await env.KV.get(deliveryId);
		if (seen) return new Response("OK", { status: 200 });

		await env.KV.put(deliveryId, "1", { expirationTtl: 86400 });

		const event = request.headers.get("X-GitHub-Event");
		if (!event) return new Response("Bad Request", { status: 400 });

		if (!isSupportedEvent(event)) return new Response("OK", { status: 200 });

		ctx.waitUntil(processEvents(event, rawBody, env));

		return new Response("OK", { status: 200 });
	},
};
