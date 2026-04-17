export const configTemplate = `defaults:
  runtime: claude
  model: sonnet

server:
  port: 7777
  tunnel: none                    # cloudflare, ngrok, localtunnel, or none

github:
  webhook_secret: \${HIVE_WEBHOOK_SECRET}
  repos: []

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
