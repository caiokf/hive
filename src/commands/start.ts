import type { Command } from "commander"
import { spawn } from "node:child_process"
import chalk from "chalk"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"
import { startDaemon, getDaemonStatus } from "../core/daemon.js"

export function registerStartCommand(program: Command) {
  program
    .command("start")
    .description("Start the hive daemon (webhook server + cron scheduler)")
    .option("-f, --foreground", "Run in foreground instead of detaching")
    .action(async (flags) => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      const status = getDaemonStatus(hiveDir)
      if (status.running) {
        console.log(chalk.yellow(`Daemon already running (PID ${status.pid})`))
        process.exit(0)
      }

      const config = loadConfig(hiveDir)
      const tasks = loadTasks(hiveDir)

      if (tasks.length === 0) {
        console.warn(chalk.yellow("Warning: no tasks found in .hive/tasks/"))
      }

      if (flags.foreground) {
        console.log(chalk.bold("Starting hive daemon in foreground..."))
        const { stop } = await startDaemon({ hiveDir, config, tasks, foreground: true })

        // Keep process alive
        process.on("SIGINT", () => { stop(); process.exit(0) })
        process.on("SIGTERM", () => { stop(); process.exit(0) })
      } else {
        // Spawn detached child process
        const child = spawn(process.execPath, [process.argv[1], "start", "--foreground"], {
          detached: true,
          stdio: "ignore",
          cwd: process.cwd(),
          env: process.env,
        })
        child.unref()

        console.log(chalk.green(`Daemon started (PID ${child.pid})`))
        console.log(chalk.dim(`  Webhook server: http://localhost:${config.server.port}`))
        console.log(chalk.dim(`  Tasks: ${tasks.length} loaded`))
        console.log(chalk.dim(`  Logs: .hive/daemon.log`))
      }
    })
}
