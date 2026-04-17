import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import type { Run, RunStatus, RunResult } from "./types.js"
import { ensureDir, getRunsDir } from "../util/paths.js"

export function createRun(hiveDir: string, opts: {
  taskName: string
  trigger: Run["trigger"]
  links?: Run["links"]
}): Run {
  const runsDir = getRunsDir(hiveDir)
  ensureDir(runsDir)

  const run: Run = {
    id: crypto.randomUUID().slice(0, 8),
    taskName: opts.taskName,
    status: "pending",
    startedAt: new Date().toISOString(),
    trigger: opts.trigger,
    links: opts.links,
  }

  writeRun(hiveDir, run)
  return run
}

export function updateRun(hiveDir: string, runId: string, updates: {
  status?: RunStatus
  result?: RunResult
  error?: string
  completedAt?: string
}): Run | null {
  const run = getRun(hiveDir, runId)
  if (!run) return null

  Object.assign(run, updates)
  if (updates.status && updates.status !== "running" && updates.status !== "pending") {
    run.completedAt = updates.completedAt ?? new Date().toISOString()
  }

  writeRun(hiveDir, run)
  return run
}

export function getRun(hiveDir: string, runId: string): Run | null {
  const runsDir = getRunsDir(hiveDir)
  const filePath = path.join(runsDir, `${runId}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

export function listRuns(hiveDir: string, opts?: {
  taskName?: string
  status?: RunStatus
  limit?: number
}): Run[] {
  const runsDir = getRunsDir(hiveDir)
  if (!fs.existsSync(runsDir)) return []

  const files = fs.readdirSync(runsDir)
    .filter(f => f.endsWith(".json"))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(runsDir, a))
      const statB = fs.statSync(path.join(runsDir, b))
      return statB.mtimeMs - statA.mtimeMs
    })

  let runs: Run[] = files.map(f =>
    JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf-8"))
  )

  if (opts?.taskName) {
    runs = runs.filter(r => r.taskName === opts.taskName)
  }
  if (opts?.status) {
    runs = runs.filter(r => r.status === opts.status)
  }
  if (opts?.limit) {
    runs = runs.slice(0, opts.limit)
  }

  return runs
}

function writeRun(hiveDir: string, run: Run): void {
  const runsDir = getRunsDir(hiveDir)
  ensureDir(runsDir)
  fs.writeFileSync(
    path.join(runsDir, `${run.id}.json`),
    JSON.stringify(run, null, 2),
    "utf-8",
  )
}
