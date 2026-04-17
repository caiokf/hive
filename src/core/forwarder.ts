import { spawn, execSync } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { ensureDir } from "../util/paths.js"

export interface ForwarderEntry {
  repo: string
  pid: number
  startedAt: string
}

export interface DaemonState {
  daemonPid: number
  secret: string
  forwarders: ForwarderEntry[]
}

export interface ForwarderHandle {
  repo: string
  process: ChildProcess
  restarts: number
  lastRestart: number
}

export interface ForwarderManagerOpts {
  hiveDir: string
  repos: string[]
  port: number
  events: string[]
  onLog: (msg: string) => void
}

export function getStatePath(hiveDir: string): string {
  return path.join(hiveDir, "daemon.state")
}

function getLogsDir(hiveDir: string): string {
  return path.join(hiveDir, "logs")
}

// ── gh-webhook extension checks ───────────────────────────────

export function isGhInstalled(): boolean {
  try {
    execSync("gh --version", { stdio: "pipe" })
    return true
  } catch { return false }
}

export function isGhWebhookInstalled(): boolean {
  try {
    const output = execSync("gh extension list", { stdio: "pipe", encoding: "utf-8" })
    return output.includes("gh-webhook")
  } catch { return false }
}

export function installGhWebhook(): boolean {
  try {
    execSync("gh extension install cli/gh-webhook", { stdio: "pipe" })
    return true
  } catch { return false }
}

// ── Orphan cleanup ────────────────────────────────────────────

export function cleanupOrphans(hiveDir: string, onLog?: (msg: string) => void): void {
  const statePath = getStatePath(hiveDir)
  if (!fs.existsSync(statePath)) return

  let state: DaemonState
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
  } catch {
    fs.unlinkSync(statePath)
    return
  }

  // Kill orphaned forwarder processes
  for (const fwd of state.forwarders) {
    try {
      process.kill(fwd.pid, 0) // Check if alive
      process.kill(fwd.pid, "SIGTERM")
      onLog?.(`Killed orphan forwarder for ${fwd.repo} (PID ${fwd.pid})`)
    } catch {
      // Already dead, nothing to do
    }
  }

  // Delete orphan webhooks from GitHub
  for (const fwd of state.forwarders) {
    deleteRepoCliWebhooks(fwd.repo, onLog)
  }

  fs.unlinkSync(statePath)
  onLog?.("Cleaned up stale daemon state")
}

/**
 * Delete any "cli" type webhooks on a repo (these are created by gh webhook forward).
 */
function deleteRepoCliWebhooks(repo: string, onLog?: (msg: string) => void): void {
  try {
    const output = execSync(`gh api repos/${repo}/hooks --jq '.[] | select(.name == "cli") | .id'`, {
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
      timeout: 10_000,
    })
    const ids = output.trim().split("\n").filter(Boolean)
    for (const id of ids) {
      try {
        execSync(`gh api repos/${repo}/hooks/${id} --method DELETE`, {
          stdio: "pipe",
          timeout: 10_000,
        })
        onLog?.(`Deleted orphan webhook ${id} on ${repo}`)
      } catch {
        onLog?.(`Warning: failed to delete webhook ${id} on ${repo}`)
      }
    }
  } catch {
    // Can't list hooks — permissions issue or repo gone, skip
  }
}

// ── Forwarder Manager ─────────────────────────────────────────

export function createForwarderManager(opts: ForwarderManagerOpts) {
  const { hiveDir, repos, port, events, onLog } = opts
  const handles: Map<string, ForwarderHandle> = new Map()
  const secret = crypto.randomBytes(32).toString("hex")
  const logsDir = getLogsDir(hiveDir)
  ensureDir(logsDir)

  const MAX_BACKOFF = 60_000
  const BASE_BACKOFF = 1_000

  function spawnForwarder(repo: string): ForwarderHandle | null {
    const eventsArg = events.length > 0 ? events.join(",") : "*"
    const logFile = path.join(logsDir, `${repo.replace("/", "-")}.log`)
    const logFd = fs.openSync(logFile, "a")

    const args = [
      "webhook", "forward",
      `--repo=${repo}`,
      `--events=${eventsArg}`,
      `--url=http://localhost:${port}/webhook`,
      `--secret=${secret}`,
    ]

    const child = spawn("gh", args, {
      stdio: ["ignore", logFd, logFd],
      detached: false,
    })

    if (!child.pid) {
      onLog(`Failed to spawn forwarder for ${repo}`)
      try { fs.closeSync(logFd) } catch {}
      return null
    }

    onLog(`Forwarder started for ${repo} (PID ${child.pid})`)

    const handle: ForwarderHandle = {
      repo,
      process: child,
      restarts: 0,
      lastRestart: Date.now(),
    }

    // Monitor for exit and restart with backoff
    child.on("exit", (code, signal) => {
      try { fs.closeSync(logFd) } catch {}

      // Don't restart if we're shutting down
      if (!handles.has(repo)) return

      const backoff = Math.min(BASE_BACKOFF * Math.pow(2, handle.restarts), MAX_BACKOFF)
      onLog(`Forwarder for ${repo} exited (code=${code}, signal=${signal}), restarting in ${backoff}ms`)

      setTimeout(() => {
        if (!handles.has(repo)) return
        handle.restarts++
        handle.lastRestart = Date.now()
        const newHandle = spawnForwarder(repo)
        if (newHandle) {
          newHandle.restarts = handle.restarts
          newHandle.lastRestart = handle.lastRestart
          handles.set(repo, newHandle)
          writeState()
        }
      }, backoff)
    })

    handles.set(repo, handle)
    return handle
  }

  function writeState(): void {
    const state: DaemonState = {
      daemonPid: process.pid,
      secret,
      forwarders: Array.from(handles.values())
        .filter(h => h.process.pid)
        .map(h => ({
          repo: h.repo,
          pid: h.process.pid!,
          startedAt: new Date(h.lastRestart).toISOString(),
        })),
    }
    fs.writeFileSync(getStatePath(hiveDir), JSON.stringify(state, null, 2))
  }

  return {
    secret,

    start(): void {
      for (const repo of repos) {
        spawnForwarder(repo)
      }
      writeState()
      onLog(`${repos.length} forwarder(s) started`)
    },

    stop(): void {
      const repos = Array.from(handles.keys())
      for (const [repo, handle] of handles) {
        handles.delete(repo) // Delete first to prevent restart-on-exit
        try {
          handle.process.kill("SIGTERM")
          onLog(`Stopped forwarder for ${repo} (PID ${handle.process.pid})`)
        } catch {}
      }

      // Clean up webhooks from GitHub
      for (const repo of repos) {
        deleteRepoCliWebhooks(repo, onLog)
      }

      // Remove state file
      try { fs.unlinkSync(getStatePath(hiveDir)) } catch {}
    },

    /** Reset restart backoff for a repo (call on successful event receipt) */
    resetBackoff(repo: string): void {
      const handle = handles.get(repo)
      if (handle) handle.restarts = 0
    },

    getStatus(): Array<{ repo: string; pid: number | undefined; restarts: number }> {
      return Array.from(handles.values()).map(h => ({
        repo: h.repo,
        pid: h.process.pid,
        restarts: h.restarts,
      }))
    },

    get repoCount(): number {
      return handles.size
    },
  }
}
