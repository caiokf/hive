import type { Command } from "commander"
import chalk from "chalk"
import { findHiveDir, loadTasks } from "../core/config.js"

export function registerListCommand(program: Command) {
  program
    .command("list")
    .description("List configured tasks and their triggers")
    .option("--json", "Output as JSON")
    .action((flags) => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      const tasks = loadTasks(hiveDir)

      if (flags.json) {
        console.log(JSON.stringify(tasks, null, 2))
        return
      }

      if (tasks.length === 0) {
        console.log(chalk.dim("\n  No tasks found in .hive/tasks/\n"))
        return
      }

      console.log(chalk.bold(`\n  ${tasks.length} task(s)\n`))
      for (const task of tasks) {
        const trigger = task.trigger.type === "cron"
          ? chalk.blue(`cron: ${task.trigger.schedule}`)
          : chalk.magenta(`webhook: ${task.trigger.event}${task.trigger.action ? ` [${task.trigger.action.join(", ")}]` : ""}`)

        console.log(`  ${chalk.bold(task.name)}`)
        if (task.description) console.log(chalk.dim(`    ${task.description}`))
        console.log(`    ${trigger}`)
        console.log(chalk.dim(`    runtime: ${task.task.runtime ?? "default"}, model: ${task.task.model ?? "default"}`))
        console.log()
      }
    })
}
