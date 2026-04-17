import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { getRuntime } from "@caiokf/valet"
import type { HiveConfig, TaskDefinition, Run } from "./types.js"
import { resolveModelAlias } from "./config.js"
import { createRun, updateRun } from "./run-store.js"

export interface ExecuteOpts {
  hiveDir: string
  config: HiveConfig
  task: TaskDefinition
  trigger: Run["trigger"]
  links?: Run["links"]
  signal?: AbortSignal
  onStart?: (run: Run) => void
  onComplete?: (run: Run) => void
}

export async function executeTask(opts: ExecuteOpts): Promise<Run> {
  const { hiveDir, config, task, trigger, links, signal, onStart, onComplete } = opts
  const spec = task.task

  const run = createRun(hiveDir, {
    taskName: task.name,
    trigger,
    links,
  })

  updateRun(hiveDir, run.id, { status: "running" })
  run.status = "running"
  onStart?.(run)

  const runtimeName = spec.runtime ?? config.defaults.runtime
  const model = resolveModelAlias(config, spec.model ?? config.defaults.model)

  try {
    const runtime = getRuntime(runtimeName)

    // Build prompt: inline prompt or agent file
    let prompt = spec.prompt ?? ""
    if (spec.agent) {
      const agentPath = path.resolve(path.dirname(hiveDir), spec.agent)
      if (fs.existsSync(agentPath)) {
        prompt = fs.readFileSync(agentPath, "utf-8")
      } else {
        throw new Error(`Agent file not found: ${agentPath}`)
      }
    }

    // Append context files if specified
    if (spec.context?.length) {
      const contextParts: string[] = []
      for (const pattern of spec.context) {
        const resolved = path.resolve(path.dirname(hiveDir), pattern)
        if (fs.existsSync(resolved)) {
          contextParts.push(`\n--- ${pattern} ---\n${fs.readFileSync(resolved, "utf-8")}`)
        }
      }
      if (contextParts.length > 0) {
        prompt += "\n\n# Context\n" + contextParts.join("\n")
      }
    }

    // Write prompt to temp file (valet runtimes expect promptFile)
    const promptFile = path.join(os.tmpdir(), `hive-${run.id}.md`)
    fs.writeFileSync(promptFile, prompt, "utf-8")

    let result
    try {
      result = await runtime.execute({
        taskName: task.name,
        model,
        prompt,
        promptFile,
        signal,
        overrides: config.runtimes[runtimeName]
          ? { env: config.runtimes[runtimeName].env, extraArgs: config.runtimes[runtimeName].args }
          : undefined,
      })
    } finally {
      try { fs.unlinkSync(promptFile) } catch {}
    }

    const updatedRun = updateRun(hiveDir, run.id, {
      status: result.exitCode === 0 ? "success" : "failure",
      result: {
        raw: result.raw,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      },
    })!

    onComplete?.(updatedRun)
    return updatedRun
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMsg.includes("timeout") || errorMsg.includes("TIMEOUT")

    const updatedRun = updateRun(hiveDir, run.id, {
      status: isTimeout ? "timeout" : "failure",
      error: errorMsg,
    })!

    onComplete?.(updatedRun)
    return updatedRun
  }
}
