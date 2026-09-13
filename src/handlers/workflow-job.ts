import { generateJwt } from "../auth/generate-jwt";
import { generateHeaderAndPayload, getInstallationToken } from "../auth/utils";
import { buildAuthor, buildRepositoryField } from "../builders/utils";
import type { DiscordEmbed } from "../types/discord";
import {
	type GitHubAnnotation,
	type Step,
	workflowJobConclusion,
} from "../types/github";
import type {
	BaseEventPayload,
	WorkflowJobEvent,
} from "../types/github-events";
import type { InstallationToken } from "../types/types";
import { allowed_mentions, colorList } from "../utils/constants";
import { postToDiscord } from "../utils/discord";
import {
	basePayloadOrFallback,
	capitalizeText,
	formatText,
	hexToNumber,
	noLinkPreview,
	truncateText,
} from "../utils/utils";
import { handleResponseError } from "./response-error";

function getWorkflowJobSteps(steps: Step[] | null): Step[] | undefined {
	const relevantSteps = steps?.flatMap((step) => {
		if (step.conclusion === "cancelled" || step.conclusion === "failure")
			return step;
		else return [];
	});
	return relevantSteps;
}

async function fetchAnnotations(
	installationToken: InstallationToken,
	checkRunUrl: string,
	page: number,
): Promise<{ annotations: GitHubAnnotation[]; more: boolean }> {
	const response = await fetch(
		`${checkRunUrl}/annotations?per_page=100&page=${page}`,
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

	const rawAnnotations = (await response.json()) as GitHubAnnotation[];
	const more = rawAnnotations.length === 100;
	const annotations = rawAnnotations.filter(
		(annotation) => annotation.annotation_level === "failure",
	);

	return { annotations, more };
}

async function getAnnotations(
	installationToken: InstallationToken,
	checkRunUrl: string,
): Promise<GitHubAnnotation[]> {
	let page = 1;
	let { annotations, more } = await fetchAnnotations(
		installationToken,
		checkRunUrl,
		page,
	);
	let relevantAnnotations = annotations;
	while (more) {
		page++;
		({ annotations, more } = await fetchAnnotations(
			installationToken,
			checkRunUrl,
			page,
		));
		relevantAnnotations = [...relevantAnnotations, ...annotations];
	}
	return relevantAnnotations;
}

export async function handleWorkflowJob(
	payload: BaseEventPayload,
	env: Env,
): Promise<void> {
	const { repository, sender } = basePayloadOrFallback(payload);
	const { action, workflow_job, installation } = payload as WorkflowJobEvent;

	if (action !== "completed") return;
	if (!workflowJobConclusion.includes(workflow_job.conclusion)) return;
	const ghostwriter = env.DISCORD_ROLE_ID;

	const relevantSteps: Step[] | undefined = getWorkflowJobSteps(
		workflow_job.steps,
	);
	let formattedSteps = "";

	if (relevantSteps?.length) {
		formattedSteps = relevantSteps
			.map(
				(step) =>
					`**Step**: ${step.name}\n**Status**: ${capitalizeText(step.conclusion)}`,
			)
			.join("\n");
	}

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
	await postToDiscord({ content }, env);

	const headerAndPayload: string = generateHeaderAndPayload(env);
	const jwt: string = await generateJwt(headerAndPayload, env);
	const installationToken: string = await getInstallationToken(
		installation.id,
		jwt,
	);

	const annotations: GitHubAnnotation[] = await getAnnotations(
		installationToken,
		workflow_job.check_run_url,
	);

	if (annotations.length === 0) return;

	const annotationEmbeds = annotations.map((annotation): DiscordEmbed => {
		return {
			title: truncateText(annotation.title ?? "", 250),
			description: truncateText(annotation.message, 1000),
			color: hexToNumber(colorList.failure),
			fields: [buildRepositoryField(repository)],
			author: buildAuthor(sender),
			timestamp: workflow_job.completed_at,
		};
	});

	for (let i = 0; i < annotationEmbeds.length; i += 5) {
		const embeds = annotationEmbeds.slice(i, i + 5);
		await postToDiscord({ embeds, allowed_mentions }, env);
	}
}
