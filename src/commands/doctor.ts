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
      const healthResults = await Promise.all(
        runtimes.map(async (runtime) => {
          try {
            return await runtime.healthCheck()
          } catch (e) {
            return {
              name: runtime.name,
              command: runtime.name,
              installed: false,
              version: null,
              authenticated: "unknown" as const,
              authDetail: String(e),
              error: String(e),
            }
          }
        }),
      )

      for (const health of healthResults) {
        if (health.installed && health.authenticated === "yes") {
          const ver = health.version ? ` (${health.version})` : ""
          console.log(chalk.green(`  ✓ ${health.name}${ver}`))
        } else if (health.installed) {
          console.log(chalk.yellow(`  ⚠ ${health.name} — installed but auth: ${health.authenticated}`))
          issues++
        } else {
          console.log(chalk.dim(`  ○ ${health.name} — not installed`))
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
