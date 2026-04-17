import type { Command } from "commander"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { input, confirm } from "@inquirer/prompts"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import { findHiveDir } from "../core/config.js"
import { isGhInstalled, isGhWebhookInstalled, installGhWebhook } from "../core/forwarder.js"

export function registerConnectCommand(program: Command) {
  program
    .command("connect [repo]")
    .description("Add a GitHub repo for webhook forwarding")
    .action(async (repoArg) => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      console.log(chalk.bold("\n  Connect GitHub repo\n"))

      // 1. Check gh CLI
      if (!isGhInstalled()) {
        console.error(chalk.red("  ✗ GitHub CLI (gh) not found"))
        console.log(chalk.dim("    Install: https://cli.github.com\n"))
        process.exit(1)
      }
      console.log(chalk.green("  ✓ GitHub CLI (gh) found"))

      // 2. Check gh auth
      try {
        execSync("gh auth status", { stdio: "pipe" })
        console.log(chalk.green("  ✓ Authenticated with GitHub"))
      } catch {
        console.error(chalk.red("  ✗ Not authenticated with GitHub"))
        console.log(chalk.dim("    Run: gh auth login\n"))
        process.exit(1)
      }

      // 3. Check gh-webhook extension
      if (!isGhWebhookInstalled()) {
        console.log(chalk.yellow("  ⚠ gh-webhook extension not installed"))
        const install = await confirm({ message: "Install gh-webhook extension now?" })
        if (install) {
          if (installGhWebhook()) {
            console.log(chalk.green("  ✓ gh-webhook extension installed"))
          } else {
            console.error(chalk.red("  ✗ Failed to install gh-webhook extension"))
            console.log(chalk.dim("    Run: gh extension install cli/gh-webhook\n"))
            process.exit(1)
          }
        } else {
          console.log(chalk.dim("    hive needs this to forward webhooks from GitHub"))
          console.log(chalk.dim("    Run: gh extension install cli/gh-webhook\n"))
          process.exit(1)
        }
      } else {
        console.log(chalk.green("  ✓ gh-webhook extension installed"))
      }

      // 4. Get repo
      const repo = repoArg ?? await input({
        message: "Repository (owner/repo):",
        validate: (v) => v.includes("/") || "Use format: owner/repo",
      })

      // 5. Verify repo access
      try {
        execSync(`gh repo view ${repo}`, { stdio: "pipe" })
        console.log(chalk.green(`  ✓ Access to ${repo} confirmed`))
      } catch {
        console.error(chalk.red(`  ✗ Cannot access ${repo}`))
        process.exit(1)
      }

      // 6. Update config.yaml
      const configPath = path.join(hiveDir, "config.yaml")
      const raw = fs.readFileSync(configPath, "utf-8")
      const configObj = parseYaml(raw) ?? {}

      if (!configObj.github) configObj.github = {}
      if (!configObj.github.repos) configObj.github.repos = []
      if (configObj.github.repos.includes(repo)) {
        console.log(chalk.yellow(`  ⚠ ${repo} already in config`))
      } else {
        configObj.github.repos.push(repo)
        fs.writeFileSync(configPath, stringifyYaml(configObj, { lineWidth: 0 }), "utf-8")
        console.log(chalk.green(`  ✓ Added ${repo} to config`))
      }

      console.log(chalk.bold("\n  Done!\n"))
      console.log(chalk.dim("  When you run `hive start`, webhook events from"))
      console.log(chalk.dim(`  ${repo} will be forwarded to your local daemon.`))
      console.log(chalk.dim("  No tunnel or public URL needed.\n"))
    })
}
