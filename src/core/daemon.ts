import fs from "node:fs"
import type { Server } from "node:http"
import type { HiveConfig, TaskDefinition, Run } from "./types.js"
import { createWebhookServer } from "./webhook-server.js"
import type { WebhookEvent } from "./webhook-server.js"
import { createScheduler } from "./scheduler.js"
import { executeTask } from "./executor.js"
import { getPidFile, getLogFile, ensureDir } from "../util/paths.js"
import path from "node:path"

export interface DaemonOpts {
  hiveDir: string
  config: HiveConfig
  tasks: TaskDefinition[]
  foreground?: boolean
}

export async function startDaemon(opts: DaemonOpts): Promise<{
  stop: () => void
  server: Server | null
}> {
  const { hiveDir, config, tasks } = opts
  const activeRuns = new Map<string, AbortController>()
  let server: Server | null = null

  const logFile = getLogFile(hiveDir)
  ensureDir(path.dirname(logFile))

  function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`
    fs.appendFileSync(logFile, line)
    if (opts.foreground) process.stdout.write(line)
  }

  // Write PID file
  const pidFile = getPidFile(hiveDir)
  fs.writeFileSync(pidFile, String(process.pid))

  // Extract webhook links from payload
  function extractLinks(event: WebhookEvent): Run["links"] {
    const links: Run["links"] = {}
    const pr = event.payload.pull_request as Record<string, unknown> | undefined
    if (pr?.html_url) links.pr = String(pr.html_url)
    const issue = event.payload.issue as Record<string, unknown> | undefined
    if (issue?.html_url) links.issue = String(issue.html_url)
    return Object.keys(links).length > 0 ? links : undefined
  }

  // Task execution handler
  function runTask(task: TaskDefinition, trigger: Run["trigger"], links?: Run["links"]) {
    const controller = new AbortController()

    const promise = executeTask({
      hiveDir,
      config,
      task,
      trigger,
      links,
      signal: controller.signal,
      onStart(run) {
        activeRuns.set(run.id, controller)
        log(`Run started: ${run.id} (${task.name})`)
      },
      onComplete(run) {
        activeRuns.delete(run.id)
        log(`Run completed: ${run.id} (${task.name}) → ${run.status}${run.result ? ` [${run.result.durationMs}ms]` : ""}`)
      },
    })

    // Set timeout if configured
    if (task.task.timeout) {
      setTimeout(() => {
        if (activeRuns.has(task.name)) {
          controller.abort()
          log(`Run timed out: ${task.name} after ${task.task.timeout}ms`)
        }
      }, task.task.timeout)
    }

    promise.catch(err => log(`Run error: ${task.name} — ${err}`))
  }

  // Start webhook server
  const webhookTasks = tasks.filter(t => t.trigger.type === "webhook")
  if (webhookTasks.length > 0 || config.server.port) {
    const webhook = createWebhookServer({
      config,
      tasks,
      onEvent(event, matchedTasks) {
        for (const task of matchedTasks) {
          runTask(task, {
            type: "webhook",
            event: event.event,
            action: event.action,
          }, extractLinks(event))
        }
      },
      onLog: log,
    })

    server = webhook.start(config.server.port)
    log(`Webhook server listening on port ${config.server.port}`)
  }

  // Start cron scheduler
  const scheduler = createScheduler({
    tasks,
    onTrigger(task) {
      runTask(task, { type: "cron" })
    },
    onLog: log,
  })
  scheduler.start()

  log(`Daemon started — ${webhookTasks.length} webhook task(s), ${scheduler.jobCount} cron job(s)`)

  // Graceful shutdown
  function stop() {
    log("Shutting down...")
    scheduler.stop()
    if (server) server.close()
    for (const [id, controller] of activeRuns) {
      controller.abort()
      log(`Cancelled active run: ${id}`)
    }
    try { fs.unlinkSync(pidFile) } catch {}
    log("Daemon stopped")
  }

  process.on("SIGTERM", stop)
  process.on("SIGINT", stop)

  return { stop, server }
}

export function getDaemonStatus(hiveDir: string): { running: boolean; pid?: number } {
  const pidFile = getPidFile(hiveDir)
  if (!fs.existsSync(pidFile)) return { running: false }

  const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10)
  if (isNaN(pid)) return { running: false }

  try {
    process.kill(pid, 0) // Check if process exists
    return { running: true, pid }
  } catch {
    // Stale PID file — clean it up
    try { fs.unlinkSync(pidFile) } catch {}
    return { running: false }
  }
}

export function stopDaemon(hiveDir: string): boolean {
  const status = getDaemonStatus(hiveDir)
  if (!status.running || !status.pid) return false

  try {
    process.kill(status.pid, "SIGTERM")
    return true
  } catch {
    return false
  }
}
