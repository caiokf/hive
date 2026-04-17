import { z } from "zod"

// ── Trigger types ──────────────────────────────────────────────

export const webhookTriggerSchema = z.object({
  type: z.literal("webhook"),
  event: z.string(),
  action: z.array(z.string()).optional(),
  filter: z.record(z.string()).optional(),
})

export const cronTriggerSchema = z.object({
  type: z.literal("cron"),
  schedule: z.string(),
})

export const triggerSchema = z.discriminatedUnion("type", [
  webhookTriggerSchema,
  cronTriggerSchema,
])

export type TaskTrigger = z.infer<typeof triggerSchema>

// ── Task spec ──────────────────────────────────────────────────

export const taskSpecSchema = z.object({
  runtime: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  agent: z.string().optional(),
  context: z.array(z.string()).optional(),
  timeout: z.number().optional().default(300_000),
})

export type TaskSpec = z.infer<typeof taskSpecSchema>

// ── Task definition (.hive/tasks/*.yaml) ───────────────────────

export const taskDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  trigger: triggerSchema,
  task: taskSpecSchema,
})

export type TaskDefinition = z.infer<typeof taskDefinitionSchema>

// ── Run status & result ────────────────────────────────────────

export type RunStatus = "pending" | "running" | "success" | "failure" | "timeout" | "cancelled"

export interface RunResult {
  raw: string
  exitCode: number
  durationMs: number
}

export interface Run {
  id: string
  taskName: string
  status: RunStatus
  startedAt: string
  completedAt?: string
  result?: RunResult
  trigger: {
    type: "webhook" | "cron" | "manual"
    event?: string
    action?: string
  }
  links?: {
    pr?: string
    issue?: string
  }
  error?: string
}

// ── Config schema ──────────────────────────────────────────────

export const serverConfigSchema = z.object({
  port: z.number().optional().default(7777),
  tunnel: z.enum(["cloudflare", "ngrok", "localtunnel", "none"]).optional().default("none"),
})

export const githubConfigSchema = z.object({
  webhook_secret: z.string().optional(),
  repos: z.array(z.string()).optional().default([]),
})

export const runtimeConfigSchema = z.object({
  command: z.string(),
  env: z.record(z.string()).optional().default({}),
  args: z.array(z.string()).optional().default([]),
})

export const configSchema = z.object({
  defaults: z.object({
    runtime: z.string().optional().default("claude"),
    model: z.string().optional().default("sonnet"),
  }).optional().default({}),
  server: serverConfigSchema.optional().default({}),
  github: githubConfigSchema.optional().default({}),
  runtimes: z.record(runtimeConfigSchema).optional().default({}),
  aliases: z.record(z.string()).optional().default({}),
})

export type HiveConfig = z.infer<typeof configSchema>
export type ServerConfig = z.infer<typeof serverConfigSchema>
export type GithubConfig = z.infer<typeof githubConfigSchema>
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
