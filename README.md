```
 ██   ██ ██ ██    ██ ████████
 ██   ██ ██ ██    ██ ██
 ███████ ██ ██    ██ █████
 ██   ██ ██  ██  ██  ██
 ██   ██ ██    ██    ████████
```

# hive

### Autonomous AI agents triggered by GitHub events

Define what should happen when a PR is opened, an issue is labeled, or a comment is posted — hive listens for GitHub webhook events and dispatches AI coding agents to handle them. It also supports cron-like schedules for recurring tasks like morning PR summaries or weekly dependency audits.

### Zero-config webhook forwarding

No tunnels, no public URLs, no permanent webhooks. hive uses `gh webhook forward` to pipe GitHub events directly to your local machine. Connect a repo, start the daemon, done.

### One daemon, many agents

hive runs as a background daemon with a webhook server and cron scheduler. When a trigger fires, it spawns an agent using your existing AI CLI subscriptions (Claude Code, Codex, Gemini, etc.) through [valet](https://github.com/caiokf/valet). No extra API keys needed.

### Full run visibility

Every run is stored locally with status, duration, output, and links back to the PR or issue that triggered it. View everything in a real-time TUI dashboard or query the run history from the command line.

```bash
hive init                    # scaffold .hive/ directory
hive connect owner/repo      # add a GitHub repo
hive start                   # start listening for events
hive dash                    # view the dashboard
```

## Prerequisites

hive requires two tools installed on your machine:

1. **GitHub CLI (`gh`)** — [Install](https://cli.github.com), then run `gh auth login`
2. **gh-webhook extension** — `gh extension install cli/gh-webhook`

The `gh-webhook` extension enables `gh webhook forward`, which creates a temporary webhook on your repo and streams events to your local machine over a WebSocket. No tunnel or public URL needed. When the daemon stops, the webhook is cleaned up automatically.

Run `hive doctor` to verify everything is set up correctly.

## Install

```bash
npm install -g @caiokf/hive
```

Or use without installing:

```bash
npx @caiokf/hive init
```

## Quick Start

```bash
# 1. Scaffold the .hive/ directory
hive init

# 2. Check prerequisites, runtimes, and config
hive doctor

# 3. Connect a GitHub repo
hive connect owner/repo

# 4. Start the daemon (webhook forwarding + cron scheduler)
hive start

# 5. Open the TUI dashboard
hive dash

# 6. Or manually trigger a task
hive run review-prs
```

## How It Works

1. **Define tasks** in `.hive/tasks/*.yaml` — each with a trigger (webhook event or cron) and a task spec (runtime, model, prompt)
2. **Connect repos** — `hive connect owner/repo` adds a repo to your config
3. **Start the daemon** — `hive start` launches a webhook server, spawns `gh webhook forward` per repo, and starts the cron scheduler
4. **Events flow** — GitHub sends events via WebSocket to `gh webhook forward`, which POSTs them to the local webhook server. hive matches events against task triggers.
5. **Agents execute** — Matching tasks spawn AI agents via [valet](https://github.com/caiokf/valet), which handles prompt delivery across runtimes
6. **Results are stored** — Each run is saved with status, output, duration, and links
7. **Clean shutdown** — `hive stop` kills forwarders, deletes temporary webhooks from GitHub, and stops the server

### Crash recovery

If the daemon crashes, orphaned `gh webhook forward` processes and their temporary GitHub webhooks are cleaned up automatically on the next `hive start`. The daemon writes a state file (`.hive/daemon.state`) tracking all child PIDs and webhook IDs.

## Task Definitions

```yaml
# .hive/tasks/review-prs.yaml
name: review-prs
description: Run code review on new PRs

trigger:
  type: webhook
  event: pull_request
  action:
    - opened
    - synchronize
  filter:
    base: main

task:
  runtime: claude
  model: sonnet
  agent: ./agents/reviewer.md
  context:
    - ARCHITECTURE.md
    - docs/**/*.md
  timeout: 300000
```

```yaml
# .hive/tasks/morning-summary.yaml
name: morning-summary
description: Daily summary of open PRs and issues

trigger:
  type: cron
  schedule: "0 9 * * 1-5"          # weekdays at 9am

task:
  runtime: claude
  model: haiku
  prompt: >-
    Summarize all open PRs and issues for this repository.
    Group by priority and highlight anything that needs
    immediate attention.
  timeout: 120000
```

## Configuration

```yaml
# .hive/config.yaml
defaults:
  runtime: claude
  model: sonnet

server:
  port: 7777

github:
  repos:
    - owner/repo

runtimes:
  claude:
    command: claude
    env: {}
    args: []

aliases:
  opus: claude-opus-4-6
  sonnet: claude-sonnet-4-6
  haiku: claude-haiku-4-5-20251001
```

## Commands

| Command | Description |
|---|---|
| `hive init` | Scaffold `.hive/` directory, check prerequisites, install gh-webhook |
| `hive connect <repo>` | Add a GitHub repo for webhook forwarding |
| `hive start` | Start daemon (webhook server + forwarders + cron scheduler) |
| `hive stop` | Stop daemon, kill forwarders, clean up GitHub webhooks |
| `hive status` | Show daemon status, forwarding repos, active/recent runs |
| `hive dash` | Open TUI dashboard with real-time run monitoring |
| `hive add` | Interactively create a new task definition |
| `hive list` | List configured tasks and their triggers |
| `hive run <task>` | Manually trigger a task |
| `hive logs [task]` | Show run history and logs |
| `hive doctor` | Check gh CLI, gh-webhook extension, runtimes, config |

## Core Concepts

- **Trigger** — an event source: either a GitHub webhook event filter or a cron expression
- **Task** — what to do when a trigger fires: which runtime/model to use, the prompt or agent file, and any context
- **Run** — a single execution of a task with status, logs, duration, and result
- **Daemon** — the background process that listens for triggers and dispatches tasks
- **Forwarder** — a `gh webhook forward` process that pipes GitHub events to the local daemon

## Project Structure

After `hive init`:

```
.hive/
├── config.yaml          # Global config, server settings, model aliases
├── tasks/
│   ├── review-prs.yaml  # Webhook-triggered PR review
│   └── morning-summary.yaml  # Cron-scheduled daily summary
├── agents/
│   └── reviewer.md      # Agent prompt file
├── runs/                # Run history (JSON)
└── logs/                # Per-repo forwarding logs
```

## Supported Runtimes

hive uses [valet](https://github.com/caiokf/valet) for runtime abstraction. Any runtime valet supports works with hive:

| Runtime | CLI | Auth |
|---|---|---|
| Claude Code | `claude` | Subscription or `ANTHROPIC_API_KEY` |
| Codex | `codex` | `OPENAI_API_KEY` |
| Gemini CLI | `gemini` | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |
| Kimi | `kimi` | `MOONSHOT_API_KEY` |
| CodeRabbit | `cr` | `cr auth status` |
| OpenCode | `opencode` | `~/.opencode/config.json` |
| Droid | `droid` | Subscription |
| MastraCode | `mastracode` | Subscription |
| Pi | `pi` | Subscription |

Run `hive doctor` to check which runtimes are available.

## Related

- **[valet](https://github.com/caiokf/valet)** — Unified adapter layer for AI coding CLI tools
- **[crev](https://github.com/caiokf/crev)** — AI-powered multi-reviewer code review CLI

## License

MIT
