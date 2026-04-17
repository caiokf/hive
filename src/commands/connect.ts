import type { Command } from "commander"
import { execSync } from "node:child_process"
import chalk from "chalk"
import { input, select, confirm } from "@inquirer/prompts"
import { findHiveDir, loadConfig } from "../core/config.js"
import fs from "node:fs"
import path from "node:path"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"

export function registerConnectCommand(program: Command) {
  program
    .command("connect")
    .description("Set up GitHub webhook connectivity")
    .action(async () => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found. Run `hive init` first."))
        process.exit(1)
      }

      console.log(chalk.bold("\n  GitHub Connection Setup\n"))

      // Check gh CLI
      try {
        execSync("gh --version", { stdio: "pipe" })
        console.log(chalk.green("  ✓ GitHub CLI (gh) found"))
      } catch {
        console.error(chalk.red("  ✗ GitHub CLI (gh) not found"))
        console.log(chalk.dim("    Install: https://cli.github.com\n"))
        process.exit(1)
      }

      // Check gh auth
      try {
        execSync("gh auth status", { stdio: "pipe" })
        console.log(chalk.green("  ✓ Authenticated with GitHub"))
      } catch {
        console.error(chalk.red("  ✗ Not authenticated with GitHub"))
        console.log(chalk.dim("    Run: gh auth login\n"))
        process.exit(1)
      }

      // Select repo
      const repo = await input({
        message: "Repository (owner/repo):",
        validate: (v) => v.includes("/") || "Use format: owner/repo",
      })

      // Verify repo access
      try {
        execSync(`gh repo view ${repo}`, { stdio: "pipe" })
        console.log(chalk.green(`  ✓ Access to ${repo} confirmed`))
      } catch {
        console.error(chalk.red(`  ✗ Cannot access ${repo}`))
        process.exit(1)
      }

      const config = loadConfig(hiveDir)

      // Generate webhook secret if needed
      let secret = config.github.webhook_secret
      if (!secret) {
        const { randomBytes } = await import("node:crypto")
        secret = randomBytes(32).toString("hex")
        console.log(chalk.green(`  ✓ Generated webhook secret`))
        console.log(chalk.dim(`    Set HIVE_WEBHOOK_SECRET=${secret}`))
      }

      // Determine webhook URL
      const method = await select({
        message: "How will GitHub reach your machine?",
        choices: [
          { name: "I'll set up a tunnel myself (Cloudflare, ngrok, etc.)", value: "manual" },
          { name: "I have a public URL already", value: "url" },
        ],
      })

      let webhookUrl: string
      if (method === "url") {
        webhookUrl = await input({
          message: "Webhook URL:",
          validate: (v) => v.startsWith("http") || "Must be a URL",
        })
      } else {
        webhookUrl = await input({
          message: `Webhook URL (use port ${config.server.port}):`,
          default: `https://your-tunnel.example.com/webhook`,
          validate: (v) => v.startsWith("http") || "Must be a URL",
        })
      }

      // Create webhook on GitHub
      const createWebhook = await confirm({
        message: `Create webhook on ${repo}?`,
      })

      if (createWebhook) {
        try {
          const result = execSync(
            `gh api repos/${repo}/hooks --method POST --field "name=web" --field "active=true" --field "config[url]=${webhookUrl}" --field "config[content_type]=json" --field "config[secret]=${secret}" --field "events[]=pull_request" --field "events[]=issues" --field "events[]=issue_comment" --field "events[]=push"`,
            { stdio: "pipe", encoding: "utf-8" },
          )
          console.log(chalk.green(`  ✓ Webhook created on ${repo}`))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes("Hook already exists")) {
            console.log(chalk.yellow("  ⚠ Webhook already exists on this repo"))
          } else {
            console.error(chalk.red(`  ✗ Failed to create webhook: ${msg}`))
          }
        }
      }

      // Update config.yaml
      const configPath = path.join(hiveDir, "config.yaml")
      const raw = fs.readFileSync(configPath, "utf-8")
      const configObj = parseYaml(raw) ?? {}

      if (!configObj.github) configObj.github = {}
      if (!configObj.github.repos) configObj.github.repos = []
      if (!configObj.github.repos.includes(repo)) {
        configObj.github.repos.push(repo)
      }
      configObj.github.webhook_secret = "${HIVE_WEBHOOK_SECRET}"

      fs.writeFileSync(configPath, stringifyYaml(configObj, { lineWidth: 0 }), "utf-8")
      console.log(chalk.green(`  ✓ Updated config.yaml`))

      console.log(chalk.bold("\n  Setup complete!\n"))
      console.log(chalk.dim("  Next steps:"))
      console.log(chalk.dim(`    export HIVE_WEBHOOK_SECRET=${secret}`))
      console.log(chalk.dim("    hive start"))
      console.log()
    })
}
