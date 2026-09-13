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
export interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	fields?: DiscordField[];
	author?: DiscordAuthor;
	timestamp?: string;
}

export interface DiscordMentionsNone {
	parse: [];
}

export interface DiscordPost {
	content?: string;
	embeds?: DiscordEmbed[];
	allowed_mentions?: DiscordMentionsNone;
}
