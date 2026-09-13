export async function handleResponseError(response: Response): Promise<void> {
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
