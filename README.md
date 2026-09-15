# GitHub to Discord Webhook Notification

## Overview

This project is a Middleware for a Cloudflare Worker that listens to GitHub Webhook events and sends notifications to a Discord server via Discord Webhook. The GitHub Webhook comes from a GitHub App that is installed in the GitHub account so it can listen to all selected repositories instead of requiring setting up an individual Webhook for each repository.

## Example

![`pull_request_review_comment` notification example](example.png)

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

## The Middleware

### Inner Workings

- `X-GitHub-Event` header is used to identify the event type and `X-Hub-Signature-256` header is used to verify the payload authenticity
- Deduplicate events are filtered using the `X-GitHub-Delivery` header + `KV` storage with 24h expiration
- Asynchronous processing of the events
  - `Response` is sent immediately to GitHub with the corresponding `Status Code` and `Status Message` to avoid timeouts
  - The event is processed in the background via `ctx.waitUntil()`
- `Retry-After` header is respected when Discord returns a `429 Too Many Requests` response (max of 5 retries)

### Filters

- When `owner = sender` except for GitHub Actions/Workflows
- Non-relevant `action` and `state` like `edited`, `draft`, `labeled`, etc.
- GitHub Actions/Workflows only notifies for `failure`, `cancelled`, `timed_out` and `action_required`

### Discord Messages

- Main limits:
  - max 6000 characters per post
  - max 10 `embeds` per post
  - `content`: max 2000 characters
  - `embeds`
    - `title`: max 256 characters
    - `description`: max 4096 characters
- `allowed_mentions` is used to avoid `@everyone` and `@here` mentions in the Discord messages
- Each event generates two Discord Messages:
  - **content**: a brief summary of the event with the `@mention` to trigger the mobile notification
  - **embeds**: more detailed information about the event, including the original post when context is necessary
- The colors used for the `embeds` communicate a mix of `event type` and `semantics` depending on the `event`, `action` or `state`:
  - issue: `#AB80FF`
  - pull_request: `#FF4AC3`
  - discussion: `#2EE6D7`
  - star: `#FFD500`
  - fork: `#50B6FF`
  - resolved: `#51D936`
  - attention: `#FF9925`
  - failure: `#F22468`
  - dismissed: `#A6ADB6`

## Built With

- TypeScript
- Cloudflare Workers
- Wrangler
- Bun

## Known issues

- `comment.diff_hunk` behavior is inconsistent in both `GitHub Webview` and `GitHub API`, some `pull_request_review_comment` and `pull_request_review_thread` linked to some lines will show the `diff` and some others will not. It's also a completely arbitrary behavior, I thought it could be due to a line that changed and one that didn't, but it happens in both cases.
- `ctx.waitUntil()` can cancel some processes when multiple events are triggered at once due to the free account limitations. In my case it only happens when there are multiple pending comments in a review and the user submits the review. That triggers `pull_request_review` - which is filtered - and one `pull_request_review_comment` for each pending comment. This ends up working in my favor because I don't want to receive all the comments of the same thread at once, ideally, I would receive only the first comment of the bunch, but that's something I can't filter for.

## Context

I've recently learned the basics of GitHub Actions, so my fork of the TypeScript TmLanguage project for the [Nebula Oni Theme](https://github.com/psudo-dev/nebula-oni-theme), a VSCode Color Theme, can be automatically updated with the upstream repository and create an `issue` if any relevant changes are detected.

The problem is that GitHub notifications have always been a bit inconsistent. As I was doing research I've found out that using Discord Webhooks was a nice way to get custom notifications for GitHub events. Of all options Cloudflare Workers seemed as the more straight forward option for my use case.

### Learning Curve

Since I'm a first timer when it comes to Cloudflare Workers, GitHub and Discord Webhooks, there sure was a lot of learning involved in this project. Most of it came down to the authentication and authorization process (for the webhook but also for the GitHub API), which was a bit overwhelming, and understanding in details the GitHub Webhook events and payloads and how to format them into a Discord message.

The most annoying part was deciding which GitHub events and informations were relevant, what events could only be triggered by other users, and deciding how to design and format the Discord messages for each `event`, `action` and `state`. I had to constantly check and update the specsheet I created while keeping all the documentations opened to crosscheck something I might have missed.

Getting the Discord messages to look right in terms of content and formatting almost drove me crazy, a lot of trial and error, tons of testing. I thank a lot the existence of [Discohook](https://discohook.app) because it helped me a lot to prototype the Discord messages and better understand the Discord Webhook payload.

## Struggles and Annoyances

### Star, Watch and Subscribe

> &nbsp;
> **[Watching versus starring](https://docs.github.com/en/rest/activity/watching?apiVersion=2026-03-10#watching-versus-starring)**
>
> In August 2012, we [changed the way watching works](https://github.com/blog/1204-notifications-stars) on GitHub. Some API client applications may still be using the original "watcher" endpoints for accessing this data. You should now use the "star" endpoints instead. For more information, [REST API endpoints for starring](https://docs.github.com/en/rest/activity/starring) and the [changelog post](https://developer.github.com/changes/2012-09-05-watcher-api/).
>
> In responses from the REST API, **subscribers_count** corresponds to the number of **watchers**, whereas **watchers**, **watchers_count**, and **stargazers_count** correspond to the number of users that have **starred** a repository.
> &nbsp;

In other words, until 2012, there was just `watch` but then they changed it to `star`, and for legacy reasons they kept the `watch` endpoint, which is normal.

But then, for no apparent logical or necessary reason, they decided to create a new feature with the same name `watch` as the legacy one, but with a different meaning and functionality.

**WHY?!?**

To mitigate this predictable confusion, internally, the new `watch` function is related to `subscribers_count` but there is no `subscribe` event at all, so there is also no way to track when a user `subscribes` or `unsubscribes` to a repository, which makes no sense either.

I really don't understand how and why this came to be, because it seems so obvious that you shouldn't have created a new functionality with the same name as a legacy one, even more when you could have simply called it `subscribe` and `unsubscribe`, which would have been much better - maybe more like `follow` and `unfollow`.

### GitHub Webhook Events and Payloads

I really wished GitHub would make it more clear in the documentation which `events`, `action` and `state` are triggered by what level of access and permissions. And I think that's relevant for anyone using GitHub Webhooks because you want to be able to easily know and filter out what can be triggered by each type of user so you don't have to handle unnecessary events and payloads.

GitHub already has roles:

- `Read` — can view, clone, and comment on issues, pull requests, and discussions
- `Triage` — can manage issues and pull requests without write access
- `Write` — can push code and contribute to the repository
- `Maintain` — can manage the repository without access to sensitive or destructive actions
- `Admin` — full access to the repository except destructive actions on the organization
- `Owner` — full access to the repository and its settings, including destructive actions

All the trial and error and even setting up a second account to figure it out all the possibilities and limitations of the GitHub Webhook events and payloads felt like a waste of time because it could have been easily avoided by a better documentation.

Imagine if you could have a table or a list for each event, with the `action` and `state` and what `role` can trigger them. Or even better, a filter for each `role` just like they have for each `action`.

### Pull Request Comment

Maybe it's also related to some legacy functionality, but there should be a `pull_request_comment` event instead of using `issue_comment` for Pull Request comments.

One could say that underneath everything is an `issue` and that's why they use `issue_comment`, but that would also be valid for `discussion` and `discussion` has `discussion_comment`.

So in order to deal with a Pull Request comments, you have to filter `issue_comment` by the existence of `issue.pull_request` and then translate all the proprieties to handle it as a Pull Request comment.

For something that helps to keep code organized, GitHub is quite confusing.

### Discord Mentions

After some initial testings I found out that I needed `@mention` in order to properly trigger the mobile notifications in Discord.

At first I intended to just post a single message with both `content` and `embeds`, but unfortunately, when you use `@mention` Discord will highlight the whole message in an ugly orange color.

So I decided to split the message into two, one for the `content` with the `@mention` and another for the `embeds` with the detailed information.

In order to hide the `@mention` in the message, I used the same color of the orange highlight (`#30271C`) and set it for the `role` so it stays invisible in the message.

**\*** for some reason Discord mobile notifications don't render `markdown` so it shows all the markdown formatting in the notification.

## Resources

- [Creating webhooks for a GitHub App](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks#creating-webhooks-for-a-github-app)
- [GitHub Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitHub REST API documentation](https://docs.github.com/en/rest)
- [Discord Official Webhook Resource](https://docs.discord.com/developers/resources/webhook)
- [Discord API Types Community Reference](https://discord-api-types.dev/api/discord-api-types-v10/interface/RESTPostAPIWebhookWithTokenJSONBody)
- [Discohook](https://discohook.app)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

[@psudo-dev](https://github.com/psudo-dev)
