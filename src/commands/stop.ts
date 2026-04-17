import type { Command } from "commander"
import chalk from "chalk"
import { findHiveDir } from "../core/config.js"
import { stopDaemon, getDaemonStatus } from "../core/daemon.js"

export function registerStopCommand(program: Command) {
  program
    .command("stop")
    .description("Stop the hive daemon")
    .action(() => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found."))
        process.exit(1)
      }

      const status = getDaemonStatus(hiveDir)
      if (!status.running) {
        console.log(chalk.yellow("Daemon is not running."))
        process.exit(0)
      }

      if (stopDaemon(hiveDir)) {
        console.log(chalk.green(`Daemon stopped (was PID ${status.pid})`))
      } else {
        console.error(chalk.red("Failed to stop daemon"))
        process.exit(1)
      }
    })
}
