# GitHub to Discord Webhook Notification

## Overview

This project is a Middleware for a Cloudflare Worker that listens to GitHub Webhook events and sends notifications to a Discord channel via Discord Webhook. It supports various GitHub events such as issues, pull requests, discussions, and more. It formats the payload into a Discord messages, allowing for rich notifications in Discord.

## Context

I've recently learned the basics of GitHub Actions, so my fork of the TypeScript TmLanguage project for the [Nebula Oni Theme](https://github.com/psudo-dev/nebula-oni-theme), a VSCode Color Theme, can be automatically updated with the upstream repository and create an Issue if any relevant changes are detected.

The problem is that GitHub notifications have always been a bit inconsistent. As I was doing research I've found out that using Discord Webhooks was a nice way to get custom notifications for GitHub events. Of all options Cloudflare Workers seemed as the more straight forward option for my use case.

Since I'm a first timer when it comes to Cloudflare Workers, GitHub and Discord Webhooks, there sure was a lot of learning involved in this project. Most of it came down to the authentication and authorization process (for the webhook but also for the GitHub API), which was a bit overwhelming, and understanding in details the GitHub Webhook events and payloads and how to format them into a Discord message.

The most annoying part was deciding which GitHub events and informations were relevant, what events could only be triggered by other users, and deciding how to design and format the Discord messages for each event, `action` and `state`. I had to constantly check and update the specsheet I created while keeping all the documentations opened to crosscheck something I might have missed. Getting the Discord messages to look good and in a way I was satisfied with almost drove me crazy, a lot of trial and error, tons of testing.

## Setup

### Discord Server

1. Create a webhook in the desired server in `Server Settings` → `Integrations` → `Webhooks`
2. Save the Webhook URL
3. Enable Developer Mode in `User Settings` → `Advanced` → `Developer Mode`
4. In `Server Settings` → `Roles` create a role for `mentions` so the messages can trigger the mobile notification
5. Click in `Copy Role ID` and save it

### GitHub App

1. Create a GitHub App in `GitHub Settings` → `Developer Settings` → `GitHub Apps`
2. Configure the Webhook URL to the Worker endpoint (or use any valid URL as a placeholder)
3. Generate and save the Private Key (\*.pem)
4. Enable permissions for following events:
   - `issues`
   - `issue_comment`
   - `pull_request`
   - `pull_request_review`
   - `pull_request_review_comment`
   - `pull_request_review_thread`
   - `discussion`
   - `discussion_comment`
   - `workflow_job`
   - `star`
   - `fork`
5. Install the App

### Cloudflare Workers

1. Create a KV namespace
2. Link the KV namespace to the Worker in `wrangler.toml`
3. Configure the secrets

#### Secrets

- **GITHUB_WEBHOOK_SECRET**: Webhook secret configured in the GitHub App
- **DISCORD_WEBHOOK_URL**: Webhook URL for the Discord Server
- **GITHUB_APP_ID**: Application ID for the GitHub App
- **GITHUB_PRIVATE_KEY**: Private Key (base64 encoded) for the GitHub App already formatted so no parsing is required:
  - No header: `-----BEGIN RSA PRIVATE KEY-----`
  - No footer: `-----END RSA PRIVATE KEY-----`
  - No newlines
- **DISCORD_ROLE_ID**: Role ID for the Discord channel
  - format: `<@&role_id>`

## Notifications

- `X-GitHub-Event` header is used to identify the event type and `X-Hub-Signature-256` header is used to verify the payload authenticity
- Deduplicate events are filtered using the `X-GitHub-Delivery` header + `KV` storage with 24h expiration
- Asynchronous processing of the events
  - `Response` is sent immediately to GitHub with the corresponding `Status Code` and `Status Message` to avoid timeouts
  - The event is processed in the background via `ctx.waitUntil()`
- Filter when `owner` = `sender` except for GitHub Actions/Workflows
- Filter non-relevant `action` and `state` like `edited` or `draft`
- Each event generates two Discord Messages:
  - **content**: a brief summary of the event with the `@mention` to trigger the mobile notification
  - **embeds**: a more detailed information about the event, including a reference to the original post for context when necessary
- `Retry-After` header is respected when Discord returns a `429 Too Many Requests` response (max 5 retries)

## Struggles and Annoyances

### GitHub Webhook Events and Payloads

I really wished GitHub would make it more clear in the documentation which events, `action` and `state` are triggered by what level of access and permissions. And I think that's relevant for anyone using GitHub Webhooks because you want to be able to easily filter out what can be triggered by each type of user.

GitHub already has roles:

- `Read` — can view, clone, and comment on issues, pull requests, and discussions
- `Triage` — can manage issues and pull requests without write access
- `Write` — can push code and contribute to the repository
- `Maintain` — can manage the repository without access to sensitive or destructive actions
- `Admin` — full access to the repository except destructive actions on the organization
- `Owner` — full access to the repository and its settings, including destructive actions

All the trial and error and even setting up a second account to figure it out all the possibilities and limitations of the GitHub Webhook events and payloads felt like a waste of time because it could have been easily avoided by a better documentation.

Imagine if you could have a table or a list for each event, with the `action` and `state` and what `role` can trigger them. Or even better, a filter for each `role`, just like they have for each `action`.

### Star, Watch and Subscribe

> #### [Watching versus starring](https://docs.github.com/en/rest/activity/watching?apiVersion=2026-03-10#watching-versus-starring)
>
> In August 2012, we [changed the way watching works](https://github.com/blog/1204-notifications-stars) on GitHub. Some API client applications may still be using the original "watcher" endpoints for accessing this data. You should now use the "star" endpoints instead. For more information, [REST API endpoints for starring](https://docs.github.com/en/rest/activity/starring) and the [changelog post](https://developer.github.com/changes/2012-09-05-watcher-api/).
>
> In responses from the REST API, **subscribers_count** corresponds to the number of **watchers**, whereas **watchers**, **watchers_count**, and **stargazers_count** correspond to the number of users that have **starred** a repository.

In other words, until 2012, there was just `watch` but then they changed it to `star`, and for legacy reasons they kept the `watch` endpoint, which is fine.

But then, for no apparent logical or necessary reason, they decided to create a new function but with the same name `watch` as the legacy one, but with a different meaning and functionality.

**WHY?!?**

To mitigate this predictable confusion, internally, the new `watch` function is related to `subscribers_count` but there is no `subscribe` event at all, so there is no way to track when a user `subscribes` or `unsubscribes` to a repository, which makes no sense either.

I really don't understand how and why this came to be, because it seems so obvious that you shouldn't have created a new function with the same name as a legacy one, even more when you could have easily called the new function `subscribe` and `unsubscribe`.

## Resources

- [Creating webhooks for a GitHub App](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks#creating-webhooks-for-a-github-app)
- [GitHub Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitHub REST API documentation](https://docs.github.com/en/rest)
- [Discord Official Webhook Resource](https://docs.discord.com/developers/resources/webhook)
- [Discord API Types Community Reference](https://discord-api-types.dev/api/discord-api-types-v10/interface/RESTPostAPIWebhookWithTokenJSONBody)
- [Discohook](https://discohook.app)
