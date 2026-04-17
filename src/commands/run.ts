import type { Command } from "commander"
import chalk from "chalk"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"
import { executeTask } from "../core/executor.js"

export function registerRunCommand(program: Command) {
  program
    .command("run <task>")
    .description("Manually trigger a task")
    .action(async (taskName) => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      const config = loadConfig(hiveDir)
      const tasks = loadTasks(hiveDir)
      const task = tasks.find(t => t.name === taskName)

      if (!task) {
        console.error(chalk.red(`Task not found: ${taskName}`))
        console.log(chalk.dim(`Available tasks: ${tasks.map(t => t.name).join(", ") || "none"}`))
        process.exit(1)
      }

      console.log(chalk.bold(`\n  Running: ${task.name}\n`))

      const controller = new AbortController()
      process.on("SIGINT", () => {
        controller.abort()
        console.log(chalk.yellow("\n  Cancelled."))
      })

      const startTime = Date.now()
      const run = await executeTask({
        hiveDir,
        config,
        task,
        trigger: { type: "manual" },
        signal: controller.signal,
        onStart(r) {
          console.log(chalk.dim(`  Run ID: ${r.id}`))
        },
        onComplete(r) {
          const elapsed = Date.now() - startTime
          console.log()
          if (r.status === "success") {
            console.log(chalk.green(`  ✓ Completed in ${formatDuration(elapsed)}`))
          } else {
            console.log(chalk.red(`  ✗ ${r.status}${r.error ? `: ${r.error}` : ""}`))
          }
        },
      })

      if (run.result?.raw) {
        console.log(chalk.dim("\n  --- Output ---\n"))
        console.log(run.result.raw)
      }

      console.log()
      process.exit(run.status === "success" ? 0 : 1)
    })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m${secs}s`
}
