export const reviewPrsTemplate = `name: review-prs
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
`

export const morningSummaryTemplate = `name: morning-summary
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
`

export const reviewerAgentTemplate = `You are a senior software engineer performing a code review.

Review the PR changes carefully. Focus on:
- Correctness and potential bugs
- Security vulnerabilities
- Performance implications
- Code clarity and maintainability

Provide specific, actionable feedback with file and line references.
Be concise — only flag issues that matter.
`
