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

### One daemon, many agents

hive runs as a background daemon with a webhook server and cron scheduler. When a trigger fires, it spawns an agent using your existing AI CLI subscriptions (Claude Code, Codex, Gemini, etc.) through [valet](https://github.com/caiokf/valet). No extra API keys needed.

### Full run visibility

Every run is stored locally with status, duration, output, and links back to the PR or issue that triggered it. View everything in a real-time TUI dashboard or query the run history from the command line.

```bash
# Set up a project
hive init

# Connect to a GitHub repo
hive connect

# Start listening for events
hive start

# View the dashboard
hive dash
```

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

# 2. Check runtimes and config
hive doctor

# 3. Connect a GitHub repo (creates webhook via gh CLI)
hive connect

# 4. Start the daemon
hive start

# 5. Manually trigger a task
hive run review-prs

# 6. View run history
hive logs
```

## How It Works

1. **Define tasks** in `.hive/tasks/*.yaml` — each with a trigger (webhook event or cron) and a task spec (runtime, model, prompt)
2. **Start the daemon** — `hive start` launches a webhook server and cron scheduler as a background process
3. **Events arrive** — GitHub sends webhook payloads, hive matches them against task triggers
4. **Agents execute** — Matching tasks spawn AI agents via [valet](https://github.com/caiokf/valet), which handles prompt delivery across runtimes
5. **Results are stored** — Each run is saved with status, output, duration, and links

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
  tunnel: none                    # cloudflare, ngrok, localtunnel

github:
  webhook_secret: ${HIVE_WEBHOOK_SECRET}
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
| `hive init` | Scaffold `.hive/` directory with config and example tasks |
| `hive start` | Start the daemon (webhook server + cron scheduler) |
| `hive stop` | Stop the daemon |
| `hive status` | Show daemon status, active runs, recent history |
| `hive dash` | Open a TUI dashboard of in-progress and completed runs |
| `hive add` | Interactively create a new task definition |
| `hive list` | List configured tasks and their triggers |
| `hive run <task>` | Manually trigger a task |
| `hive logs [task]` | Show run history and logs |
| `hive doctor` | Check runtimes, webhook connectivity, config validity |
| `hive connect` | Set up GitHub webhook connectivity via `gh` CLI |

## Core Concepts

- **Trigger** — an event source: either a GitHub webhook event filter or a cron expression
- **Task** — what to do when a trigger fires: which runtime/model to use, the prompt or agent file, and any context
- **Run** — a single execution of a task with status, logs, duration, and result
- **Daemon** — the background process that listens for triggers and dispatches tasks

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
└── runs/                # Run history (JSON)
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
