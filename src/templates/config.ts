export const configTemplate = `defaults:
  runtime: claude
  model: sonnet

server:
  port: 7777

github:
  repos: []                       # add repos with: hive connect owner/repo

runtimes:
  claude:
    command: claude
    env: {}
    args: []

aliases:
  opus: claude-opus-4-6
  sonnet: claude-sonnet-4-6
  haiku: claude-haiku-4-5-20251001
`
