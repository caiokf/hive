import type { Command } from "commander"
import chalk from "chalk"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"
import { getDaemonStatus } from "../core/daemon.js"
import { listRuns } from "../core/run-store.js"

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
          console.log(`  ${chalk.yellow("●")} ${run.taskName} (${run.id}) — ${formatDuration(elapsed)}`)
        }
      }

      // Recent runs
      const recentRuns = listRuns(hiveDir, { limit: 10 })
        .filter(r => r.status !== "running")
      console.log(chalk.bold("\n  Recent Runs"))
      if (recentRuns.length === 0) {
        console.log(chalk.dim("  No runs yet"))
      } else {
        for (const run of recentRuns) {
          const icon = run.status === "success" ? chalk.green("✓") :
                       run.status === "failure" ? chalk.red("✗") :
                       run.status === "timeout" ? chalk.yellow("⏱") :
                       chalk.dim("○")
          const duration = run.result?.durationMs ? ` (${formatDuration(run.result.durationMs)})` : ""
          const link = run.links?.pr ? chalk.dim(` → ${run.links.pr}`) : ""
          console.log(`  ${icon} ${run.taskName} — ${run.status}${duration}${link}`)
          console.log(chalk.dim(`    ${run.startedAt} [${run.trigger.type}${run.trigger.event ? `:${run.trigger.event}` : ""}]`))
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
