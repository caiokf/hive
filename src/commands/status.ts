import type { Command } from "commander"
import fs from "node:fs"
import chalk from "chalk"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"
import { getDaemonStatus } from "../core/daemon.js"
import { listRuns } from "../core/run-store.js"
import { getStatePath } from "../core/forwarder.js"
import type { DaemonState } from "../core/forwarder.js"

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Show daemon status, active runs, and recent history")
    .action(() => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      const config = loadConfig(hiveDir)
      const tasks = loadTasks(hiveDir)
      const daemon = getDaemonStatus(hiveDir)

      // Daemon status
      console.log(chalk.bold("\n  Daemon"))
      if (daemon.running) {
        console.log(chalk.green(`  ● Running (PID ${daemon.pid})`))
        console.log(chalk.dim(`    Port: ${config.server.port}`))
      } else {
        console.log(chalk.red("  ○ Stopped"))
      }

      // Webhook forwarding status
      console.log(chalk.bold("\n  Repos"))
      const statePath = getStatePath(hiveDir)
      if (daemon.running && fs.existsSync(statePath)) {
        try {
          const state: DaemonState = JSON.parse(fs.readFileSync(statePath, "utf-8"))
          if (state.forwarders.length === 0) {
            console.log(chalk.dim("  No repos forwarding"))
          } else {
            for (const fwd of state.forwarders) {
              let alive = false
              try { process.kill(fwd.pid, 0); alive = true } catch {}
              const icon = alive ? chalk.green("●") : chalk.red("○")
              console.log(`  ${icon} ${chalk.white.bold(fwd.repo)} ${chalk.dim(`PID ${fwd.pid}`)}`)
            }
          }
        } catch {
          console.log(chalk.dim("  Unable to read forwarder state"))
        }
      } else if (config.github.repos.length > 0) {
        for (const repo of config.github.repos) {
          console.log(`  ${chalk.dim("○")} ${chalk.dim(repo)} ${chalk.dim("(not forwarding)")}`)
        }
      } else {
        console.log(chalk.dim("  No repos configured — run `hive connect owner/repo`"))
      }

      // Tasks
      console.log(chalk.bold("\n  Tasks"))
      if (tasks.length === 0) {
        console.log(chalk.dim("  No tasks configured"))
      } else {
        const webhookTasks = tasks.filter(t => t.trigger.type === "webhook")
        const cronTasks = tasks.filter(t => t.trigger.type === "cron")
        console.log(chalk.dim(`  ${webhookTasks.length} webhook, ${cronTasks.length} cron`))
      }

      // Active runs
      const activeRuns = listRuns(hiveDir, { status: "running" })
      console.log(chalk.bold("\n  Active Runs"))
      if (activeRuns.length === 0) {
        console.log(chalk.dim("  None"))
      } else {
        for (const run of activeRuns) {
          const elapsed = Date.now() - new Date(run.startedAt).getTime()
          console.log(`  ${chalk.yellow("●")} ${chalk.white.bold(run.taskName)} ${chalk.dim(run.id)} ${chalk.yellow(formatDuration(elapsed))}`)
        }
      }

      // Recent runs (one-liner format)
      const recentRuns = listRuns(hiveDir, { limit: 10 })
        .filter(r => r.status !== "running")
      console.log(chalk.bold("\n  Recent Runs"))
      if (recentRuns.length === 0) {
        console.log(chalk.dim("  No runs yet"))
      } else {
        const colWidths = {
          name: Math.max(...recentRuns.map(r => r.taskName.length)),
          duration: Math.max(...recentRuns.map(r =>
            r.result?.durationMs ? formatDuration(r.result.durationMs).length : 0
          ), 1),
          time: Math.max(...recentRuns.map(r => formatTimestampShort(r.startedAt).length), 1),
        }
        for (const run of recentRuns) {
          const icon = run.status === "success" ? chalk.green("✓") :
                       run.status === "failure" ? chalk.red("✗") :
                       run.status === "timeout" ? chalk.yellow("⏱") :
                       chalk.dim("○")
          const duration = run.result?.durationMs ? formatDuration(run.result.durationMs) : ""
          const timestamp = formatTimestampShort(run.startedAt)
          const trigger = `[${run.trigger.type}]`
          const link = run.links?.pr ? chalk.cyan(" → PR") : ""
          console.log(`  ${icon} ${chalk.white.bold(run.taskName.padEnd(colWidths.name))} ${chalk.dim(run.id)} ${chalk.cyan(duration.padStart(colWidths.duration))} ${chalk.dim(timestamp.padEnd(colWidths.time))} ${chalk.blue(trigger)}${link}`)
        }
      }

      console.log()
    })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m${secs}s`
}

function formatTimestampShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  if (diffMs < 60_000) return "just now"
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
