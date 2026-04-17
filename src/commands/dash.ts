import type { Command } from "commander"
import readline from "node:readline"
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { CronJob } from "cron"
import { findHiveDir, loadConfig, loadTasks } from "../core/config.js"
import { getDaemonStatus } from "../core/daemon.js"
import { listRuns, getRun } from "../core/run-store.js"
import { renderMarkdown } from "../ui/markdown.js"
import type { Run, TaskDefinition } from "../core/types.js"

// Hexagonal honeycomb spinner — larger pattern cycling through hex cell states
const SPINNER_FRAMES = ["⬡", "⬢", "⎔", "⏣", "⬡", "⎔", "⬢", "⏣"]

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

      const config = loadConfig(hiveDir)
      const tasks = loadTasks(hiveDir)

      let selectedIndex = 0
      let detailRunId: string | null = null
      let frame = 0
      let allRuns: Run[] = []

      function refresh() {
        allRuns = listRuns(hiveDir!, { limit: 50 })
      }

      // Compute next cron occurrences
      function getUpcoming(): Array<{ name: string; schedule: string; next: Date }> {
        const upcoming: Array<{ name: string; schedule: string; next: Date }> = []
        for (const task of tasks) {
          if (task.trigger.type !== "cron") continue
          try {
            const job = CronJob.from({ cronTime: task.trigger.schedule, onTick: () => {} })
            const nextDate = job.nextDate()
            upcoming.push({
              name: task.name,
              schedule: task.trigger.schedule,
              next: nextDate.toJSDate(),
            })
          } catch {}
        }
        return upcoming.sort((a, b) => a.next.getTime() - b.next.getTime())
      }

      function render() {
        const rows = process.stdout.rows || 24
        const cols = process.stdout.columns || 80

        // Clear screen
        process.stdout.write("\x1B[2J\x1B[H")

        // Soft palette — readable but not harsh
        const muted = {
          green: chalk.hex("#7ab87a"),
          red: chalk.hex("#b87a7a"),
          yellow: chalk.hex("#b8b87a"),
          cyan: chalk.hex("#7ab0b8"),
          blue: chalk.hex("#7a8ab8"),
          text: chalk.hex("#c0c0c0"),
          dim: chalk.hex("#808080"),
          faint: chalk.hex("#585858"),
        }

        const daemon = getDaemonStatus(hiveDir!)
        const statusDot = daemon.running ? muted.green("●") : muted.red("○")
        const statusText = daemon.running ? `Running (PID ${daemon.pid})` : "Stopped"

        console.log(`  ${chalk.bold("hive dashboard")}  ${statusDot} ${muted.dim(statusText)}`)
        console.log(muted.faint("─".repeat(Math.min(cols - 2, 80))))

        if (detailRunId) {
          renderDetail(detailRunId, rows)
          return
        }

        const activeRuns = allRuns.filter(r => r.status === "running" || r.status === "pending")
        const completedRuns = allRuns.filter(r => r.status !== "running" && r.status !== "pending")

        // Compute column widths across all visible runs for alignment
        const maxDisplay = Math.min(completedRuns.length, Math.max(rows - activeRuns.length - 16, 3))
        const visibleRuns = [...activeRuns, ...completedRuns.slice(0, maxDisplay)]
        const colWidths = visibleRuns.length > 0 ? {
          name: Math.max(...visibleRuns.map(r => r.taskName.length)),
          id: 8,
          duration: Math.max(...visibleRuns.map(r => {
            if (r.status === "running" || r.status === "pending") {
              return formatDuration(Date.now() - new Date(r.startedAt).getTime()).length
            }
            return r.result?.durationMs ? formatDuration(r.result.durationMs).length : 0
          }), 1),
          time: Math.max(...visibleRuns.map(r => formatTimestampShort(r.startedAt).length), 1),
          trigger: Math.max(...visibleRuns.map(r => r.trigger.type.length + 2), 1),
        } : { name: 1, id: 8, duration: 1, time: 1, trigger: 1 }

        if (activeRuns.length > 0) {
          console.log(muted.yellow(`\n  Active (${activeRuns.length})`))
          for (let i = 0; i < activeRuns.length; i++) {
            const run = activeRuns[i]
            const spinner = SPINNER_FRAMES[frame % SPINNER_FRAMES.length]
            const elapsed = formatDuration(Date.now() - new Date(run.startedAt).getTime())
            const selected = i === selectedIndex ? muted.cyan("›") : " "
            const timestamp = formatTimestampShort(run.startedAt)
            const trigger = `[${run.trigger.type}]`
            console.log(`  ${selected} ${muted.yellow(spinner)} ${muted.text(run.taskName.padEnd(colWidths.name))} ${muted.faint(run.id)} ${muted.yellow(elapsed.padStart(colWidths.duration))} ${muted.faint(timestamp.padEnd(colWidths.time))} ${muted.faint(trigger)}`)
          }
        }

        if (completedRuns.length > 0) {
          console.log(muted.dim(`\n  Completed (${completedRuns.length})`))
          const offset = activeRuns.length
          for (let i = 0; i < maxDisplay; i++) {
            const run = completedRuns[i]
            const icon = run.status === "success" ? muted.green("✓") :
                         run.status === "failure" ? muted.red("✗") :
                         run.status === "timeout" ? muted.yellow("⏱") :
                         run.status === "cancelled" ? muted.faint("○") :
                         muted.faint("◌")
            const duration = run.result?.durationMs ? formatDuration(run.result.durationMs) : ""
            const link = run.links?.pr ? muted.cyan(` → PR`) : ""
            const selected = (offset + i) === selectedIndex ? muted.cyan("›") : " "
            const timestamp = formatTimestampShort(run.startedAt)
            const trigger = `[${run.trigger.type}]`
            console.log(`  ${selected} ${icon} ${muted.text(run.taskName.padEnd(colWidths.name))} ${muted.faint(run.id)} ${muted.cyan(duration.padStart(colWidths.duration))} ${muted.faint(timestamp.padEnd(colWidths.time))} ${muted.faint(trigger)}${link}`)
          }
        }

        if (allRuns.length === 0) {
          console.log(muted.faint("\n  No runs yet. Trigger a task or wait for events."))
        }

        // Upcoming cron tasks
        const upcoming = getUpcoming()
        if (upcoming.length > 0) {
          console.log(muted.dim(`\n  Upcoming`))
          const nameWidth = Math.max(...upcoming.map(u => u.name.length))
          for (const u of upcoming) {
            const countdown = formatCountdown(u.next.getTime() - Date.now())
            console.log(`  ${muted.faint("◇")} ${muted.text(u.name.padEnd(nameWidth))} ${muted.yellow(countdown)} ${muted.faint(u.schedule)}`)
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
          const rendered = renderMarkdown(run.result.raw)
          const lines = rendered.split("\n")
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

      function rerunSelected() {
        const run = allRuns[selectedIndex]
        if (!run) return

        // Find the task definition
        const task = tasks.find(t => t.name === run.taskName)
        if (!task) return

        // Spawn hive run in background
        const distBin = path.resolve(process.cwd(), "dist", "bin.js")
        const entryPoint = fs.existsSync(distBin) ? distBin : process.argv[1]
        spawn(process.execPath, [entryPoint, "run", task.name], {
          stdio: "ignore",
          detached: true,
        }).unref()

        // Refresh after a short delay to pick up the new run
        setTimeout(refresh, 500)
      }

      function renderHelp() {
        console.log(chalk.hex("#484848")("\n  [↑/↓] navigate  [enter] detail  [x] re-run  [r] refresh  [q] quit"))
      }

      // Start TUI
      refresh()

      if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin)
        process.stdin.setRawMode(true)
      }

      const interval = setInterval(() => {
        frame++
        if (frame % 10 === 0) refresh() // Refresh data every ~2s
        render()
      }, 200)

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
        } else if (key.name === "x") {
          rerunSelected()
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

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now"
  const parts: string[] = []
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (parts.length === 0 || (days === 0 && hours === 0)) parts.push(`${secs}s`)
  return parts.join(" ")
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
