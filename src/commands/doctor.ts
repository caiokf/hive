import type { Command } from "commander"
import fs from "node:fs"
import chalk from "chalk"
import { getAllRuntimes } from "@caiokf/valet"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"

export function registerDoctorCommand(program: Command) {
  program
    .command("doctor")
    .description("Check runtimes, webhook connectivity, and config validity")
    .action(async () => {
      console.log(chalk.bold("\n  hive doctor\n"))
      let issues = 0

      // 1. Check .hive/ directory
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.log(chalk.red("  ✗ No .hive/ directory found"))
        console.log(chalk.dim("    Run `hive init` to create one\n"))
        process.exit(1)
      }
      console.log(chalk.green("  ✓ .hive/ directory found"))

      // 2. Load and validate config
      try {
        const config = loadConfig(hiveDir)
        console.log(chalk.green("  ✓ config.yaml is valid"))

        // Check webhook secret
        if (!config.github.webhook_secret) {
          console.log(chalk.yellow("  ⚠ No webhook secret configured (set HIVE_WEBHOOK_SECRET)"))
          issues++
        } else {
          console.log(chalk.green("  ✓ Webhook secret configured"))
        }

        // Check repos
        if (config.github.repos.length === 0) {
          console.log(chalk.yellow("  ⚠ No GitHub repos configured in config.yaml"))
          issues++
        } else {
          console.log(chalk.green(`  ✓ ${config.github.repos.length} repo(s) configured`))
        }
      } catch (err) {
        console.log(chalk.red(`  ✗ config.yaml is invalid: ${err instanceof Error ? err.message : err}`))
        issues++
      }

      // 3. Check tasks
      const tasks = loadTasks(hiveDir)
      if (tasks.length === 0) {
        console.log(chalk.yellow("  ⚠ No task definitions found in .hive/tasks/"))
        issues++
      } else {
        const webhookTasks = tasks.filter(t => t.trigger.type === "webhook")
        const cronTasks = tasks.filter(t => t.trigger.type === "cron")
        console.log(chalk.green(`  ✓ ${tasks.length} task(s): ${webhookTasks.length} webhook, ${cronTasks.length} cron`))

        // Validate agent files
        for (const task of tasks) {
          if (task.task.agent) {
            const agentPath = fs.existsSync(task.task.agent)
              ? task.task.agent
              : fs.existsSync(`${hiveDir}/../${task.task.agent}`)
            if (!agentPath) {
              console.log(chalk.yellow(`  ⚠ Agent file not found for ${task.name}: ${task.task.agent}`))
              issues++
            }
          }
        }
      }

      // 4. Check runtimes
      console.log(chalk.dim("\n  Runtimes:"))
      const runtimes = getAllRuntimes()
      for (const runtime of runtimes) {
        try {
          const health = await runtime.healthCheck()
          if (health.ok) {
            console.log(chalk.green(`  ✓ ${runtime.name} — available`))
          } else {
            console.log(chalk.yellow(`  ⚠ ${runtime.name} — ${health.message ?? "not available"}`))
            issues++
          }
        } catch {
          console.log(chalk.red(`  ✗ ${runtime.name} — health check failed`))
          issues++
        }
      }

      // Summary
      console.log()
      if (issues === 0) {
        console.log(chalk.green.bold("  All checks passed!\n"))
      } else {
        console.log(chalk.yellow(`  ${issues} issue(s) found\n`))
      }
    })
}
