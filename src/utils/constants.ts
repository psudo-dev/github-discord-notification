import type { GitHubRepository, GitHubUser } from "../types/github";
import type { ColorName } from "../types/types";

export const colorList: Record<ColorName, string> = {
	issue: "#AB80FF",
	pull_request: "#FF4AC3",
	discussion: "#2EE6D7",
	star: "#FFD500",
	fork: "#50B6FF",
	resolved: "#51D936",
	attention: "#FF9925",
	failure: "#F22468",
	dismissed: "#A6ADB6",
};

const page404 = "https://github.com/404.html";
const ghostPage = "https://github.com/ghost";

const orphanedRepoName = "orphaned-repository";

export const ghostUser: GitHubUser = {
	avatar_url: `${ghostPage}.png`,
	html_url: ghostPage,
	login: "ghost",
};

export const orphanedRepository: GitHubRepository = {
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
