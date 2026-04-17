import type { Command } from "commander"
import chalk from "chalk"
import { findHiveDir } from "../core/config.js"
import { listRuns, getRun } from "../core/run-store.js"
import { renderMarkdown } from "../ui/markdown.js"

export function registerLogsCommand(program: Command) {
  program
    .command("logs [task]")
    .description("Show run history and logs")
    .option("-n, --limit <n>", "Number of runs to show", "20")
    .option("--json", "Output as JSON")
    .option("--id <id>", "Show details for a specific run ID")
    .action((taskName, flags) => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found."))
        process.exit(1)
      }

      // Show specific run
      if (flags.id) {
        const run = getRun(hiveDir, flags.id)
        if (!run) {
          console.error(chalk.red(`Run not found: ${flags.id}`))
          process.exit(1)
        }
        if (flags.json) {
          console.log(JSON.stringify(run, null, 2))
        } else {
          printRunDetail(run)
        }
        return
      }

      // List runs
      const runs = listRuns(hiveDir, {
        taskName,
        limit: parseInt(flags.limit, 10),
      })

      if (flags.json) {
        console.log(JSON.stringify(runs, null, 2))
        return
      }

      if (runs.length === 0) {
        console.log(chalk.dim("\n  No runs found.\n"))
        return
      }

      // Compute column widths for alignment
      const colWidths = {
        name: Math.max(...runs.map(r => r.taskName.length)),
        id: 8,
        duration: Math.max(...runs.map(r =>
          r.result?.durationMs ? formatDuration(r.result.durationMs).length : 0
        ), 1),
        time: Math.max(...runs.map(r => formatTimestampShort(r.startedAt).length), 1),
        trigger: Math.max(...runs.map(r => r.trigger.type.length + 2), 1),
      }

      console.log(chalk.bold(`\n  Run History${taskName ? ` (${taskName})` : ""}\n`))
      for (const run of runs) {
        const icon = run.status === "success" ? chalk.green("✓") :
                     run.status === "failure" ? chalk.red("✗") :
                     run.status === "running" ? chalk.yellow("●") :
                     run.status === "timeout" ? chalk.yellow("⏱") :
                     run.status === "cancelled" ? chalk.dim("○") :
                     chalk.dim("◌")
        const duration = run.result?.durationMs ? formatDuration(run.result.durationMs) : ""
        const timestamp = formatTimestampShort(run.startedAt)
        const trigger = `[${run.trigger.type}]`
        const link = run.links?.pr ? chalk.cyan(` → PR`) : ""

        console.log(`  ${icon} ${chalk.white.bold(run.taskName.padEnd(colWidths.name))} ${chalk.dim(run.id)} ${chalk.cyan(duration.padStart(colWidths.duration))} ${chalk.dim(timestamp.padEnd(colWidths.time))} ${chalk.blue(trigger)}${link}`)
        if (run.error) console.log(chalk.red(`    ${run.error}`))
      }
      console.log()
    })
}

function printRunDetail(run: ReturnType<typeof getRun> & {}) {
  console.log(chalk.bold(`\n  Run ${run.id}\n`))
  console.log(`  Task:      ${run.taskName}`)
  console.log(`  Status:    ${run.status}`)
  console.log(`  Trigger:   ${run.trigger.type}${run.trigger.event ? `:${run.trigger.event}` : ""}`)
  console.log(`  Started:   ${run.startedAt}`)
  if (run.completedAt) console.log(`  Completed: ${run.completedAt}`)
  if (run.result) {
    console.log(`  Duration:  ${formatDuration(run.result.durationMs)}`)
    console.log(`  Exit code: ${run.result.exitCode}`)
  }
  if (run.links?.pr) console.log(`  PR:        ${chalk.cyan(run.links.pr)}`)
  if (run.links?.issue) console.log(`  Issue:     ${chalk.cyan(run.links.issue)}`)
  if (run.error) console.log(chalk.red(`  Error:     ${run.error}`))
  if (run.result?.raw) {
    console.log(chalk.dim("\n  --- Output ---\n"))
    console.log(renderMarkdown(run.result.raw))
  }
  console.log()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m${secs}s`
}

function formatTimestampShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  if (diffMs < 60_000) return "just now"
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
