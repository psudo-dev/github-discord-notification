import { generateJwt } from "../auth/generate-jwt";
import { generateHeaderAndPayload, getInstallationToken } from "../auth/utils";
import { buildAuthor, buildRepositoryField } from "../builders/utils";
import { allowed_mentions, colorList } from "../constants";
import { postToDiscord } from "../discord";
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
import {
	basePayloadOrFallback,
	capitalizeText,
	formatText,
	getAnnotations,
	getWorkflowJobSteps,
	hexToNumber,
	noLinkPreview,
	truncateText,
} from "../utils";

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
