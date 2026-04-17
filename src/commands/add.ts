import type { Command } from "commander"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { input, select, confirm } from "@inquirer/prompts"
import { stringify } from "yaml"
import { findHiveDir } from "../core/config.js"
import { getTasksDir, ensureDir } from "../util/paths.js"

export function registerAddCommand(program: Command) {
  program
    .command("add")
    .description("Interactively create a new task definition")
    .action(async () => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      console.log(chalk.bold("\n  Create a new task\n"))

      const name = await input({
        message: "Task name:",
        validate: (v) => /^[a-z0-9-]+$/.test(v) || "Use lowercase letters, numbers, and hyphens",
      })

      const description = await input({ message: "Description:" })

      const triggerType = await select({
        message: "Trigger type:",
        choices: [
          { name: "Webhook (GitHub event)", value: "webhook" },
          { name: "Cron (scheduled)", value: "cron" },
        ],
      }) as "webhook" | "cron"

      let trigger: Record<string, unknown>

      if (triggerType === "webhook") {
        const event = await select({
          message: "GitHub event:",
          choices: [
            { name: "pull_request", value: "pull_request" },
            { name: "issues", value: "issues" },
            { name: "issue_comment", value: "issue_comment" },
            { name: "push", value: "push" },
            { name: "pull_request_review", value: "pull_request_review" },
            { name: "Other (custom)", value: "custom" },
          ],
        })

        const eventName = event === "custom"
          ? await input({ message: "Event name:" })
          : event

        trigger = { type: "webhook", event: eventName }

        const hasActions = await confirm({ message: "Filter by action? (e.g., opened, closed)" })
        if (hasActions) {
          const actions = await input({
            message: "Actions (comma-separated):",
            default: "opened",
          })
          trigger.action = actions.split(",").map(a => a.trim())
        }
      } else {
        const schedule = await input({
          message: "Cron schedule:",
          default: "0 9 * * 1-5",
        })
        trigger = { type: "cron", schedule }
      }

      const runtime = await input({ message: "Runtime:", default: "claude" })
      const model = await input({ message: "Model:", default: "sonnet" })

      const promptType = await select({
        message: "Prompt source:",
        choices: [
          { name: "Inline prompt", value: "inline" },
          { name: "Agent file (.md)", value: "agent" },
        ],
      })

      const task: Record<string, unknown> = { runtime, model }

      if (promptType === "inline") {
        task.prompt = await input({ message: "Prompt:" })
      } else {
        task.agent = await input({
          message: "Agent file path:",
          default: `./agents/${name}.md`,
        })
      }

      const timeoutStr = await input({ message: "Timeout (ms):", default: "300000" })
      task.timeout = parseInt(timeoutStr, 10)

      // Build task definition
      const taskDef = { name, description, trigger, task }
      const yaml = stringify(taskDef, { lineWidth: 0 })

      // Write file
      const tasksDir = getTasksDir(hiveDir)
      ensureDir(tasksDir)
      const filePath = path.join(tasksDir, `${name}.yaml`)

      if (fs.existsSync(filePath)) {
        const overwrite = await confirm({ message: `${name}.yaml already exists. Overwrite?` })
        if (!overwrite) {
          console.log(chalk.dim("  Cancelled.\n"))
          return
        }
      }

      fs.writeFileSync(filePath, yaml, "utf-8")
      console.log(chalk.green(`\n  ✓ Created ${path.relative(process.cwd(), filePath)}\n`))
    })
}
