import type { Command } from "commander"
import readline from "node:readline"
import chalk from "chalk"
import { findHiveDir } from "../core/config.js"
import { getDaemonStatus } from "../core/daemon.js"
import { listRuns, getRun } from "../core/run-store.js"
import type { Run } from "../core/types.js"

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function registerDashCommand(program: Command) {
  program
    .command("dash")
    .description("Open a TUI dashboard of runs")
    .action(() => {
      const hiveDir = findHiveDir()
      if (!hiveDir) {
        console.error(chalk.red("No .hive/ directory found."))
        process.exit(1)
      }

      let selectedIndex = 0
      let detailRunId: string | null = null
      let frame = 0
      let allRuns: Run[] = []

      function refresh() {
        allRuns = listRuns(hiveDir!, { limit: 50 })
      }

      function render() {
        const rows = process.stdout.rows || 24
        const cols = process.stdout.columns || 80

        // Clear screen
        process.stdout.write("\x1B[2J\x1B[H")

        const daemon = getDaemonStatus(hiveDir!)
        const statusDot = daemon.running ? chalk.green("●") : chalk.red("○")
        const statusText = daemon.running ? `Running (PID ${daemon.pid})` : "Stopped"

        console.log(chalk.bold(`  hive dashboard  ${statusDot} ${statusText}`))
        console.log(chalk.dim("─".repeat(Math.min(cols - 2, 80))))

        if (detailRunId) {
          renderDetail(detailRunId, rows)
          return
        }

        if (allRuns.length === 0) {
          console.log(chalk.dim("\n  No runs yet. Trigger a task or wait for events.\n"))
          renderHelp()
          return
        }

        const activeRuns = allRuns.filter(r => r.status === "running" || r.status === "pending")
        const completedRuns = allRuns.filter(r => r.status !== "running" && r.status !== "pending")

        // Compute column widths across all visible runs for alignment
        const maxDisplay = Math.min(completedRuns.length, rows - activeRuns.length - 10)
        const visibleRuns = [...activeRuns, ...completedRuns.slice(0, maxDisplay)]
        const colWidths = {
          name: Math.max(...visibleRuns.map(r => r.taskName.length)),
          id: 8, // fixed: UUIDs are always 8 chars
          duration: Math.max(...visibleRuns.map(r => {
            if (r.status === "running" || r.status === "pending") {
              return formatDuration(Date.now() - new Date(r.startedAt).getTime()).length
            }
            return r.result?.durationMs ? formatDuration(r.result.durationMs).length : 0
          }), 1),
          time: Math.max(...visibleRuns.map(r => formatTimestampShort(r.startedAt).length), 1),
          trigger: Math.max(...visibleRuns.map(r => r.trigger.type.length + 2), 1), // +2 for brackets
        }

        if (activeRuns.length > 0) {
          console.log(chalk.bold.yellow(`\n  Active (${activeRuns.length})`))
          for (let i = 0; i < activeRuns.length; i++) {
            const run = activeRuns[i]
            const spinner = SPINNER_FRAMES[frame % SPINNER_FRAMES.length]
            const elapsed = formatDuration(Date.now() - new Date(run.startedAt).getTime())
            const selected = i === selectedIndex ? chalk.cyan("›") : " "
            const timestamp = formatTimestampShort(run.startedAt)
            const trigger = `[${run.trigger.type}]`
            console.log(`  ${selected} ${chalk.yellow(spinner)} ${chalk.white.bold(run.taskName.padEnd(colWidths.name))} ${chalk.dim(run.id)} ${chalk.yellow(elapsed.padStart(colWidths.duration))} ${chalk.dim(timestamp.padEnd(colWidths.time))} ${chalk.blue(trigger)}`)
          }
        }

        if (completedRuns.length > 0) {
          console.log(chalk.bold(`\n  Completed (${completedRuns.length})`))
          const offset = activeRuns.length
          for (let i = 0; i < maxDisplay; i++) {
            const run = completedRuns[i]
            const icon = run.status === "success" ? chalk.green("✓") :
                         run.status === "failure" ? chalk.red("✗") :
                         run.status === "timeout" ? chalk.yellow("⏱") :
                         run.status === "cancelled" ? chalk.dim("○") :
                         chalk.dim("◌")
            const duration = run.result?.durationMs ? formatDuration(run.result.durationMs) : ""
            const link = run.links?.pr ? chalk.cyan(` → PR`) : ""
            const selected = (offset + i) === selectedIndex ? chalk.cyan("›") : " "
            const timestamp = formatTimestampShort(run.startedAt)
            const trigger = `[${run.trigger.type}]`
            console.log(`  ${selected} ${icon} ${chalk.white.bold(run.taskName.padEnd(colWidths.name))} ${chalk.dim(run.id)} ${chalk.cyan(duration.padStart(colWidths.duration))} ${chalk.dim(timestamp.padEnd(colWidths.time))} ${chalk.blue(trigger)}${link}`)
          }
        }

        renderHelp()
      }

      function renderDetail(runId: string, rows: number) {
        const run = getRun(hiveDir!, runId)
        if (!run) {
          detailRunId = null
          return
        }

        console.log(chalk.bold(`\n  Run: ${run.id}`))
        console.log(`  Task:      ${run.taskName}`)
        console.log(`  Status:    ${formatStatus(run.status)}`)
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
          const lines = run.result.raw.split("\n")
          const maxLines = rows - 16
          for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            console.log(`  ${lines[i]}`)
          }
          if (lines.length > maxLines) {
            console.log(chalk.dim(`  ... ${lines.length - maxLines} more lines`))
          }
        }

        console.log(chalk.dim("\n  [esc] back  [q] quit"))
      }

      function renderHelp() {
        console.log(chalk.dim("\n  [↑/↓] navigate  [enter] detail  [r] refresh  [q] quit"))
      }

      // Start TUI
      refresh()

      if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin)
        process.stdin.setRawMode(true)
      }

      const interval = setInterval(() => {
        frame++
        if (frame % 20 === 0) refresh() // Refresh data every ~2s
        render()
      }, 100)

      process.stdin.on("keypress", (_str, key) => {
        if (key.name === "q" || (key.ctrl && key.name === "c")) {
          clearInterval(interval)
          if (process.stdin.isTTY) process.stdin.setRawMode(false)
          process.stdout.write("\x1B[2J\x1B[H")
          process.exit(0)
        }

        if (detailRunId) {
          if (key.name === "escape" || key.name === "backspace") {
            detailRunId = null
          }
          return
        }

        if (key.name === "up") {
          selectedIndex = Math.max(0, selectedIndex - 1)
        } else if (key.name === "down") {
          selectedIndex = Math.min(allRuns.length - 1, selectedIndex + 1)
        } else if (key.name === "return") {
          if (allRuns[selectedIndex]) {
            detailRunId = allRuns[selectedIndex].id
          }
        } else if (key.name === "r") {
          refresh()
        }
      })

      render()
    })
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

function formatStatus(status: string): string {
  switch (status) {
    case "success": return chalk.green(status)
    case "failure": return chalk.red(status)
    case "running": return chalk.yellow(status)
    case "timeout": return chalk.yellow(status)
    case "cancelled": return chalk.dim(status)
    default: return status
  }
}
