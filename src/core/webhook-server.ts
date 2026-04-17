import crypto from "node:crypto"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import type { HiveConfig, TaskDefinition } from "./types.js"

export interface WebhookEvent {
  event: string
  action?: string
  payload: Record<string, unknown>
}

export interface WebhookServerOpts {
  config: HiveConfig
  tasks: TaskDefinition[]
  onEvent: (event: WebhookEvent, matchedTasks: TaskDefinition[]) => void
  onLog?: (msg: string) => void
}

export function createWebhookServer(opts: WebhookServerOpts) {
  const { config, tasks, onEvent, onLog } = opts
  const app = new Hono()

  app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }))

  app.post("/webhook", async (c) => {
    const eventType = c.req.header("x-github-event")
    if (!eventType) {
      return c.json({ error: "missing x-github-event header" }, 400)
    }

    // Verify webhook signature if secret is configured
    if (config.github.webhook_secret) {
      const signature = c.req.header("x-hub-signature-256")
      const body = await c.req.text()
      if (!verifySignature(body, signature, config.github.webhook_secret)) {
        onLog?.("Webhook signature verification failed")
        return c.json({ error: "invalid signature" }, 401)
      }
      // Re-parse body since we consumed it
      const payload = JSON.parse(body)
      return handleEvent(c, eventType, payload)
    }

    const payload = await c.req.json()
    return handleEvent(c, eventType, payload)
  })

  function handleEvent(c: { json: (body: unknown, status?: number) => Response }, eventType: string, payload: Record<string, unknown>) {
    const action = typeof payload.action === "string" ? payload.action : undefined
    const event: WebhookEvent = { event: eventType, action, payload }

    onLog?.(`Received webhook: ${eventType}${action ? `.${action}` : ""}`)

    // Find matching tasks
    const matched = tasks.filter(t => {
      if (t.trigger.type !== "webhook") return false
      if (t.trigger.event !== eventType) return false
      if (t.trigger.action && action && !t.trigger.action.includes(action)) return false

      // Check filters
      if (t.trigger.filter) {
        for (const [key, value] of Object.entries(t.trigger.filter)) {
          const payloadValue = getNestedValue(payload, key)
          if (String(payloadValue) !== value) return false
        }
      }

      return true
    })

    if (matched.length > 0) {
      onLog?.(`Matched ${matched.length} task(s): ${matched.map(t => t.name).join(", ")}`)
      onEvent(event, matched)
    } else {
      onLog?.(`No tasks matched for ${eventType}${action ? `.${action}` : ""}`)
    }

    return c.json({ received: true, matched: matched.length })
  }

  return {
    app,
    start(port: number) {
      return serve({ fetch: app.fetch, port })
    },
  }
}

function verifySignature(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  // Support dotted paths like "pull_request.base.ref" and simple keys like "base"
  // For simple filter keys, check common GitHub webhook payload locations
  const parts = key.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  if (current !== undefined) return current

  // Fallback: for shorthand keys like "base", check common nested paths
  if (!key.includes(".")) {
    const prBase = (obj.pull_request as Record<string, unknown>)?.base as Record<string, unknown> | undefined
    if (prBase?.ref !== undefined && key === "base") return prBase.ref
  }

  return undefined
}
