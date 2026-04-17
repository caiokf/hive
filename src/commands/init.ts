import type { Command } from "commander"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { configTemplate } from "../templates/config.js"
import { reviewPrsTemplate, morningSummaryTemplate, reviewerAgentTemplate } from "../templates/tasks.js"
import { ensureDir, writeIfNew } from "../util/paths.js"
import { isGhInstalled, isGhWebhookInstalled, installGhWebhook } from "../core/forwarder.js"

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Scaffold .hive/ directory with config and example tasks")
    .action(async () => {
      const cwd = process.cwd()
      const hiveDir = path.join(cwd, ".hive")

      console.log(chalk.bold("\n  Initializing hive...\n"))

      // Create directory structure
      ensureDir(hiveDir)
      ensureDir(path.join(hiveDir, "tasks"))
      ensureDir(path.join(hiveDir, "runs"))
      ensureDir(path.join(hiveDir, "agents"))
      ensureDir(path.join(hiveDir, "logs"))

      // Write config
      writeIfNew(path.join(hiveDir, "config.yaml"), configTemplate)

      // Write example tasks
      writeIfNew(path.join(hiveDir, "tasks", "review-prs.yaml"), reviewPrsTemplate)
      writeIfNew(path.join(hiveDir, "tasks", "morning-summary.yaml"), morningSummaryTemplate)

      // Write example agent
      writeIfNew(path.join(hiveDir, "agents", "reviewer.md"), reviewerAgentTemplate)

      // Check prerequisites
      console.log(chalk.bold("\n  Prerequisites\n"))

      if (isGhInstalled()) {
        console.log(chalk.green("  ✓ GitHub CLI (gh) installed"))

        if (isGhWebhookInstalled()) {
          console.log(chalk.green("  ✓ gh-webhook extension installed"))
        } else {
          console.log(chalk.yellow("  ⚠ gh-webhook extension not installed"))
          // Try to auto-install
          if (installGhWebhook()) {
            console.log(chalk.green("  ✓ gh-webhook extension installed automatically"))
          } else {
            console.log(chalk.dim("    Run: gh extension install cli/gh-webhook"))
          }
        }
      } else {
        console.log(chalk.yellow("  ⚠ GitHub CLI (gh) not installed"))
        console.log(chalk.dim("    Install: https://cli.github.com"))
        console.log(chalk.dim("    Required for webhook forwarding from GitHub"))
      }

      console.log(chalk.bold("\n  Done!\n"))
      console.log(chalk.dim("  Next steps:"))
      console.log(chalk.dim("    1. hive connect owner/repo  — add a GitHub repo"))
      console.log(chalk.dim("    2. hive doctor              — check runtimes & config"))
      console.log(chalk.dim("    3. hive start               — start the daemon"))
      console.log(chalk.dim("    4. hive dash                — view the dashboard\n"))
    })
}
