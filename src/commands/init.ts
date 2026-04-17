import type { Command } from "commander"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { configTemplate } from "../templates/config.js"
import { reviewPrsTemplate, morningSummaryTemplate, reviewerAgentTemplate } from "../templates/tasks.js"
import { ensureDir, writeIfNew } from "../util/paths.js"

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

      // Write config
      writeIfNew(path.join(hiveDir, "config.yaml"), configTemplate)

      // Write example tasks
      writeIfNew(path.join(hiveDir, "tasks", "review-prs.yaml"), reviewPrsTemplate)
      writeIfNew(path.join(hiveDir, "tasks", "morning-summary.yaml"), morningSummaryTemplate)

      // Write example agent
      writeIfNew(path.join(hiveDir, "agents", "reviewer.md"), reviewerAgentTemplate)

      console.log(chalk.bold("\n  Done! Edit .hive/config.yaml and .hive/tasks/ to configure.\n"))
      console.log(chalk.dim("  Next steps:"))
      console.log(chalk.dim("    hive doctor    — check runtimes & config"))
      console.log(chalk.dim("    hive start     — start the daemon"))
      console.log(chalk.dim("    hive dash      — view the dashboard\n"))
    })
}
