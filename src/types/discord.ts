export interface DiscordField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface DiscordAuthor {
	name: string;
	url: string;
	icon_url: string;
}

export type DiscordRole = string;

export type DiscordContent = string;

export interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	fields?: DiscordField[];
	author?: DiscordAuthor;
	timestamp?: string;
}

export interface DiscordMentions {
	parse: [];
	roles: string[];
}

export interface DiscordPost {
	content?: DiscordContent;
	embeds?: DiscordEmbed[];
	allowed_mentions?: DiscordMentions;
}
